
from contextlib import asynccontextmanager

from aiogram import Bot
from aiogram.types import Update

from bot import create_dispatcher, configure_bot
from database import connect_db, close_db
"""FastAPI web service for the Telegram Mini App."""
import hashlib
import hmac
import json
import os
import time
from pathlib import Path
from urllib.parse import parse_qsl

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

load_dotenv()
BASE = Path(__file__).resolve().parent

bot = None
dp = create_dispatcher()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global bot

    await connect_db()

    bot = Bot(token=os.environ["BOT_TOKEN"])

    try:
        await configure_bot(bot)

        await bot.set_webhook(
            url=os.environ["WEBAPP_URL"].rstrip("/")
                + "/telegram/webhook",
            secret_token=os.environ["WEBHOOK_SECRET"],
            drop_pending_updates=False,
        )

        yield
    finally:
        if bot is not None:
            await bot.session.close()

        await close_db()


app = FastAPI(
    title="Two Chance",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)


@app.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    secret = request.headers.get(
        "X-Telegram-Bot-Api-Secret-Token", ""
    )

    if not hmac.compare_digest(
        secret,
        os.environ["WEBHOOK_SECRET"],
    ):
        raise HTTPException(
            status_code=403,
            detail="Доступ запрещён",
        )

    update = Update.model_validate(
        await request.json(),
        context={"bot": bot},
    )

    await dp.feed_update(bot, update)

    return {"ok": True}

app.mount("/static", StaticFiles(directory=BASE / "static"), name="static")
templates = Jinja2Templates(directory=str(BASE / "templates"))


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")


@app.get("/health")
async def health():
    return {"status": "ok"}


class AuthPayload(BaseModel):
    init_data: str


def verify_init_data(init_data: str, bot_token: str) -> dict:
    """Validate Telegram WebApp initData HMAC and freshness."""
    if not init_data or not bot_token:
        raise ValueError("Missing credentials")
    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = pairs.pop("hash", "")
    if not received_hash:
        raise ValueError("Missing hash")
    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(pairs.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(received_hash, calculated_hash):
        raise ValueError("Invalid signature")
    auth_date = int(pairs.get("auth_date", "0"))
    now = int(time.time())
    max_age = int(os.getenv("INITDATA_MAX_AGE", "86400"))
    if auth_date <= 0 or auth_date > now + 60 or (max_age > 0 and now - auth_date > max_age):
        raise ValueError("Expired or invalid auth_date")
    return json.loads(pairs.get("user", "{}"))


@app.post("/api/auth")
async def authenticate(payload: AuthPayload):
    try:
        user = verify_init_data(payload.init_data, os.environ.get("BOT_TOKEN", ""))
        if not isinstance(user, dict) or not isinstance(user.get("id"), int):
            raise ValueError("Invalid user")
    except (ValueError, TypeError, json.JSONDecodeError):
        raise HTTPException(status_code=401, detail="Не удалось подтвердить вход через Telegram")
    return {"ok": True, "user": {"id": user["id"], "first_name": user.get("first_name", "")}}

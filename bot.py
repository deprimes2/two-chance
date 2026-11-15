"""Telegram bot: run separately from the FastAPI web service."""
import asyncio
import logging
import os

from aiogram import Bot, Dispatcher, Router
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, MenuButtonWebApp, Message, WebAppInfo
from dotenv import load_dotenv

load_dotenv()
router = Router()


def get_webapp_url() -> str:
    url = os.environ.get("WEBAPP_URL", "").strip().rstrip("/")
    if not url.startswith("https://"):
        raise RuntimeError("WEBAPP_URL must be a public HTTPS URL")
    return url


@router.message(CommandStart())
async def start(message: Message) -> None:
    url = get_webapp_url()
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="Открыть Two Chance", web_app=WebAppInfo(url=url))
    ]])
    await message.answer(
        "Добро пожаловать в Two Chance! ✨\n\n"
        "Откройте приложение, чтобы изучить материалы или бесплатно почитать книгу.",
        reply_markup=keyboard,
    )


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    token = os.environ.get("BOT_TOKEN", "").strip()
    if not token:
        raise RuntimeError("BOT_TOKEN is missing")
    async with Bot(token=token) as bot:
        await bot.set_chat_menu_button(menu_button=MenuButtonWebApp(
            text="Открыть Two Chance", web_app=WebAppInfo(url=get_webapp_url())
        ))
        dp = Dispatcher()
        dp.include_router(router)
        await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())

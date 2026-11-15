
import os

from aiogram import Bot, Dispatcher, Router
from aiogram.filters import CommandStart
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    MenuButtonWebApp,
    Message,
    WebAppInfo,
)

router = Router()


def get_webapp_url():
    url = os.environ["WEBAPP_URL"].strip().rstrip("/")
    if not url.startswith("https://"):
        raise RuntimeError("WEBAPP_URL должен использовать HTTPS")
    return url


@router.message(CommandStart())
async def start(message: Message):
    if message.from_user:
        from database import save_user
        await save_user(message.from_user)

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[[
            InlineKeyboardButton(
                text="Открыть Two Chance",
                web_app=WebAppInfo(url=get_webapp_url()),
            )
        ]]
    )

    await message.answer(
        "Добро пожаловать в Two Chance! ✨\n\n"
        "Здесь вы можете изучить полезные материалы "
        "и бесплатно почитать книгу.",
        reply_markup=keyboard,
    )


def create_dispatcher():
    dp = Dispatcher()
    dp.include_router(router)
    return dp


async def configure_bot(bot: Bot):
    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(
            text="Открыть Two Chance",
            web_app=WebAppInfo(url=get_webapp_url()),
        )
    )

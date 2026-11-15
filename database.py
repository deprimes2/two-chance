
import os
import asyncpg

pool = None


async def connect_db():
    global pool
    pool = await asyncpg.create_pool(
        dsn=os.environ["DATABASE_URL"],
        min_size=1,
        max_size=3,
        command_timeout=15,
    )


async def close_db():
    global pool
    if pool is not None:
        await pool.close()
        pool = None


async def save_user(user):
    if pool is None:
        raise RuntimeError("База данных недоступна")

    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO users (
                telegram_id,
                first_name,
                username
            )
            VALUES ($1, $2, $3)
            ON CONFLICT (telegram_id)
            DO UPDATE SET
                first_name = EXCLUDED.first_name,
                username = EXCLUDED.username,
                last_seen_at = NOW()
            """,
            user.id,
            user.first_name or "",
            user.username,
        )

async def save_webapp_user(user: dict):
    if pool is None:
        raise RuntimeError("База данных недоступна")

    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO users (
                telegram_id, first_name, username
            )
            VALUES ($1, $2, $3)
            ON CONFLICT (telegram_id)
            DO UPDATE SET
                first_name = EXCLUDED.first_name,
                username = EXCLUDED.username,
                last_seen_at = NOW()
            """,
            user["id"],
            user.get("first_name", ""),
            user.get("username"),
        )


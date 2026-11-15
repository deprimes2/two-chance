# Two Chance — Free setup and deployment guide

This guide is in English. Every message displayed to Telegram users remains in Russian.

## 1. Create a Telegram bot

1. In Telegram, open the verified **@BotFather** account.
2. Send `/newbot`. Enter a display name (for example, `Two Chance`) and an available username ending in `bot`.
3. Copy the bot token shown by BotFather. **Never commit or share it.** If leaked, revoke it using BotFather.
4. Later, after you have an HTTPS URL, use `/setmenubutton` in BotFather: select your bot, paste the Mini App URL, and set the menu button text to `Открыть Two Chance`.

Screenshot reference: BotFather's reply after `/newbot` contains a token; the menu configuration screen prompts for a URL and button text.

## 2. Test on your computer

Install Python 3.11 or newer. From the extracted `two_chance` directory:

```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and edit:

```dotenv
BOT_TOKEN=your_actual_token_from_botfather
WEBAPP_URL=https://your-public-domain.example
INITDATA_MAX_AGE=86400
```

Start the website:

```bash
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

Open `http://127.0.0.1:8000` in your browser to preview the interface. The splash, navigation, payment placeholder and PDF fallback work outside Telegram. Telegram-specific haptics and signed `initData` require launching inside Telegram.

To test inside Telegram before deployment, expose local port 8000 with a reputable HTTPS tunnel (for example Cloudflare Quick Tunnel, subject to its current terms). Copy the generated `https://...` URL into `WEBAPP_URL` and restart the bot process. Run in a **second terminal**:

```bash
python bot.py
```

Open your bot in Telegram, send `/start`, and tap `Открыть Two Chance`. The inline WebApp button works in a private chat. Check the developer console or network tab for errors; `/health` should return `{"status":"ok"}`. A tunnel URL may change each time it restarts.

Screenshot reference: Telegram should display a blue `Открыть Two Chance` button under the welcome message; tapping it opens an in-app webview.

## 3. Add the free book

Obtain an authorized PDF copy of **«Бесплатный самоучитель счастья» by Дмитрий Гаун** and save it as `static/book.pdf`. The book is not included in the project. Verify that the particular copy is licensed for redistribution before hosting it. The reader also offers an external-open link for Telegram clients that cannot display PDFs inline.

## 4. Publish the HTTPS website for free (Render example)

Free-tier availability, limitations and prices change; verify the current plan in the provider dashboard before creating a service. A Render free web service can be suitable for the **FastAPI website**, but free instances may sleep after inactivity. This causes a slow first launch. Free web hosting does **not** necessarily include a persistent worker for aiogram polling.

1. Push the project to a **private** GitHub repository. Exclude `.env` (already in `.gitignore`). Include `static/book.pdf` only if you have redistribution rights and the hosting provider accepts its size.
2. In Render, choose **New → Web Service**, connect the repository, and select an available free instance if offered.
3. Set build command: `pip install -r requirements.txt`.
4. Set start command: `uvicorn app:app --host 0.0.0.0 --port $PORT`.
5. Add environment variable `BOT_TOKEN` with the secret token; optionally add `INITDATA_MAX_AGE=86400`. `WEBAPP_URL` is only required by `bot.py`, not the website.
6. Deploy and copy the public `https://...onrender.com` URL. Visit `/health` to verify the service.

Screenshot reference: the Render service dashboard shows an HTTPS public URL and an **Environment** section for secret variables.

## 5. Keep the Telegram bot running at no cost

The website and the polling bot are **separate processes**. Choose one of the following:

**Option A — local PC (zero hosting cost, easiest):** Run `python bot.py` on your own computer whenever you want the bot available. Set `WEBAPP_URL` to the deployed HTTPS website. The bot goes offline when your PC shuts down. The website remains accessible on Render.

**Option B — Oracle Cloud Always Free VM (requires eligibility):** Oracle Cloud may offer Always Free compute capacity in supported regions, subject to account verification, availability, quotas and terms. Create an Ubuntu VM, install Python and Git, clone your private repository securely, install requirements, and configure a `systemd` service for `python bot.py`. Set `BOT_TOKEN` and `WEBAPP_URL` in a private environment file accessible only to the service user. Enable restart on failure. Avoid running duplicate polling instances. Oracle is not guaranteed to approve every signup or have capacity.

Example Linux service file (`/etc/systemd/system/two-chance-bot.service`), after replacing the paths and username:

```ini
[Unit]
Description=Two Chance Telegram bot
After=network-online.target
Wants=network-online.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/two_chance
EnvironmentFile=/home/ubuntu/two_chance/.env
ExecStart=/home/ubuntu/two_chance/.venv/bin/python bot.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now two-chance-bot
sudo journalctl -u two-chance-bot -f
```

**Option C — paid/trial worker:** Railway and other platforms may offer credits or a trial, but these are not guaranteed permanently free. Deploy a second service from the same repo with start command `python bot.py`, no public domain, and environment variables `BOT_TOKEN` and `WEBAPP_URL`. Ensure exactly one bot worker is running.

## 6. Connect the website to Telegram

Update the bot process `.env` with the actual website URL:

```dotenv
BOT_TOKEN=123456:replace_with_your_real_token
WEBAPP_URL=https://your-app.onrender.com
INITDATA_MAX_AGE=86400
```

Restart the bot. On startup it configures its Telegram chat menu button through the Bot API. You can also configure the menu in BotFather with `/setmenubutton`. Open the bot's private chat, send `/start`, and tap the button. The URL must be HTTPS for production Mini Apps.

## 7. Test checklist

- Splash shows a red `2` and transitions after about 1.8 seconds.
- Both cards navigate correctly; back buttons return home.
- The question mark opens and closes an accessible dialog.
- `Перейти к оплате` shows `Оплата скоро появится. Мы уже работаем над этим!` and **does not charge**.
- PDF skeleton appears while checking/loading the book; missing file displays a friendly Russian notice.
- Light/dark mode follows Telegram theme in Telegram and OS preference in a browser.
- Haptics are triggered on supported Telegram clients; unsupported clients silently ignore them.
- `/health` works and `/api/auth` rejects invalid `initData`.

## Important limitations

There is no live checkout or user entitlement database. The payment button is intentionally a placeholder. Integrate a provider **server-side**, validate Telegram `initData`, and verify payment callbacks before granting access. Telegram digital-goods payment rules may require Telegram Stars; verify current Telegram platform requirements before adding Stripe, Tribute or another provider. The FastAPI web service does not run the aiogram polling loop automatically. Free hosting may sleep, have quotas, or change its plans.

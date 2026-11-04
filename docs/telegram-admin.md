# YAD Telegram administration

Existing bot: https://t.me/YADOrdersNotifyBot

## Access
Only one authorized Telegram numeric user ID is accepted, **in a private chat**.
The server uses `YAD_TELEGRAM_ADMIN_USER_ID` when present; otherwise it uses
`YAD_TELEGRAM_CHAT_ID` only if that value is a positive private-chat user ID.
Group chat IDs do **not** grant administrator access. Never use Telegram
usernames as access control or share admin credentials in chat.

Send `/admin` from the authorized Telegram account. This refreshes the
existing YAD webhook (same URL and secret) with both `message` and
`callback_query` allowed, preserving pending updates, and opens the menu.

## Commands and actions
- `/admin` — admin menu with inline actions
- `/yad_new` — 6 latest new orders
- `/yad_all` — 6 latest orders
- `/yad_stats` — count, status and seven-day totals

Tap an order to review customer/contact, destination, items and total.
Choose a status and confirm it; the database update is conditional on the
status still matching the one shown when confirmation was requested.
Buyer's status subscription is notified via the existing notifier.
A repeated or stale confirmation does not perform a second change.

Customer commands `/start`, `/orders`, `/stop`, `/ping`, `/help`
remain unchanged. Web administration under `/admin` is also unchanged.

## Security / activation
- The Telegram webhook secret header is validated **before** either workflow.
- The admin console checks both `from.id` and `message.chat.id` match
  the configured ID, that they match each other and the chat is private.
- The admin user ID is not exposed via the public health endpoint.
- If notifications go to a group, configure `YAD_TELEGRAM_ADMIN_USER_ID`
  in the Vercel production project, deploy, and open a private chat with the bot.
- No new database table or permissions are required.
- If callback activation fails, check the webhook on the authenticated
  web admin; the server will not overwrite a webhook belonging to another app.
- Do not change Telegram bot tokens or production webhook URLs when enabling
  this console. Do not send real test orders to production.

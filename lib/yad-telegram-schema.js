'use strict';
// Idempotent, non-destructive setup in the exact database used by the YAD website.
// Only called after successful admin authentication or authenticated Telegram requests.
async function ensureTelegramTables(sql){
 const found=await sql`SELECT to_regclass('public.yad_orders') AS orders_table,
  to_regclass('public.yad_telegram_links') AS links_table,
  to_regclass('public.yad_telegram_subscriptions') AS subscriptions_table`;
 if(!found[0]?.orders_table)throw Error('YAD orders table not found in the configured production database');
 if(!found[0]?.links_table){
  await sql`CREATE TABLE IF NOT EXISTS public.yad_telegram_links (
   token_hash varchar(64) PRIMARY KEY,
   order_id uuid NOT NULL REFERENCES public.yad_orders(public_id) ON DELETE CASCADE,
   created_at timestamptz NOT NULL DEFAULT now(),
   expires_at timestamptz NOT NULL,
   used_at timestamptz
  )`;
 }
 if(!found[0]?.subscriptions_table){
  await sql`CREATE TABLE IF NOT EXISTS public.yad_telegram_subscriptions (
   order_id uuid PRIMARY KEY REFERENCES public.yad_orders(public_id) ON DELETE CASCADE,
   chat_id bigint NOT NULL,
   active boolean NOT NULL DEFAULT true,
   created_at timestamptz NOT NULL DEFAULT now(),
   updated_at timestamptz NOT NULL DEFAULT now(),
   last_notified_status varchar(24),
   last_notified_at timestamptz
  )`;
 }
 if(!found[0]?.subscriptions_table){
  await sql`CREATE INDEX IF NOT EXISTS yad_telegram_subs_chat_id_idx
   ON public.yad_telegram_subscriptions(chat_id) WHERE active=true`;
 }
 return {created:!found[0]?.links_table||!found[0]?.subscriptions_table};
}
module.exports={ensureTelegramTables};

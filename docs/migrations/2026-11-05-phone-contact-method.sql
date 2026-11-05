-- Migration required before enabling phone checkout in production.
-- Preserves existing orders. Run only after explicitly approving the production schema change.
BEGIN;
ALTER TABLE public.yad_orders
  DROP CONSTRAINT yad_orders_contact_method_check;
ALTER TABLE public.yad_orders
  ADD CONSTRAINT yad_orders_contact_method_check
  CHECK (contact_method IN ('telegram','whatsapp','phone'));
COMMIT;

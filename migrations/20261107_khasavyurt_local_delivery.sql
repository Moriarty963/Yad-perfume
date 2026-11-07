-- Add the local courier choice without changing existing orders or prices.
-- Apply before publishing the storefront change to production.
BEGIN;
ALTER TABLE public.yad_orders
  DROP CONSTRAINT yad_orders_delivery_service_check;
ALTER TABLE public.yad_orders
  ADD CONSTRAINT yad_orders_delivery_service_check
  CHECK (delivery_service IN ('Wildberries', 'Ozon', 'Курьер по Хасавюрту'));
COMMIT;

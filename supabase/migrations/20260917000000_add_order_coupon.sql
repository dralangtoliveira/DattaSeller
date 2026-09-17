-- OPS-COUPON-001: o desconto negociado chega ao checkout oficial como cupom.
-- O preço público não muda; o pedido guarda o preço público do momento da venda
-- e o cupom emitido, e o banco recusa preço negociado acima do preço público.

alter table public.ds_orders
  add column if not exists public_price numeric,
  add column if not exists coupon_code text,
  add column if not exists coupon_status text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ds_orders_coupon_status_check') then
    alter table public.ds_orders
      add constraint ds_orders_coupon_status_check
      check (coupon_status is null or coupon_status in ('issued', 'applied', 'cancelled'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ds_orders_public_price_ceiling') then
    alter table public.ds_orders
      add constraint ds_orders_public_price_ceiling
      check (public_price is null or negotiated_price <= public_price);
  end if;
end $$;

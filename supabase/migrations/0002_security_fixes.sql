-- =====================================================================
-- RistOro dell'Etna — correzioni di sicurezza
-- Eseguire nel SQL Editor di Supabase DOPO 0001_init.sql.
-- =====================================================================

-- La tabella di tracking era leggibile da chiunque: con la chiave pubblica si potevano
-- elencare tutti gli ID ordine. Ora il cliente segue l'ordine solo tramite /api/orders/[id].
drop policy if exists tracking_public_read on public.order_tracking;
do $$
begin
  begin execute 'alter publication supabase_realtime drop table public.order_tracking'; exception when others then null; end;
end $$;

-- In Postgres le funzioni sono eseguibili da PUBLIC per default: il revoke da anon/authenticated non bastava.
revoke execute on function public.redeem_discount(text) from public, anon, authenticated;

-- Restituisce un utilizzo del codice sconto (ordine annullato / pagamento non completato)
create or replace function public.release_discount(p_code text) returns void
language sql security definer set search_path = public as $$
  update public.discount_codes set used = greatest(used - 1, 0) where code = upper(p_code);
$$;
revoke execute on function public.release_discount(text) from public, anon, authenticated;

-- Lo staff può modificare solo disponibilità dei piatti e pausa ordini, non prezzi o altre impostazioni
-- (le altre modifiche passano dalle azioni riservate all'admin).
drop policy if exists products_staff_update on public.products;
drop policy if exists settings_staff_update on public.settings;

-- Adiciona index do itinerário aos waypoints para persistir múltiplos itinerários e retornos
alter table public.os_waypoints add column if not exists itinerary_index integer;

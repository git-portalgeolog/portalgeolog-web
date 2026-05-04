-- Adiciona campo hora aos waypoints para suportar horário por itinerário
alter table public.os_waypoints add column if not exists hora time;

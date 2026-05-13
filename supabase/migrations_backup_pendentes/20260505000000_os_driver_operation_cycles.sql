-- Migration: Ciclos operacionais da OS por itinerário/retorno
-- Description: Persistir a trilha completa de mensagem, aceite, início e finalização por ciclo operacional.

alter table public.ordens_servico
add column if not exists driver_operation_cycles jsonb not null default '[]'::jsonb,
add column if not exists current_driver_cycle_index integer;

comment on column public.ordens_servico.driver_operation_cycles is 'Array JSON com os ciclos operacionais da OS (itinerário/retorno), incluindo estado e timestamps por ciclo.';
comment on column public.ordens_servico.current_driver_cycle_index is 'Índice atual do ciclo operacional ativo dentro de driver_operation_cycles.';

with waypoint_groups as (
  select
    w.ordem_servico_id,
    coalesce(w.itinerary_index, 0) as itinerary_index,
    min(w.position) as first_position,
    case when coalesce(w.itinerary_index, 0) < 0 then 'return' else 'itinerary' end as kind
  from public.os_waypoints w
  group by w.ordem_servico_id, coalesce(w.itinerary_index, 0)
), ordered_groups as (
  select
    wg.ordem_servico_id,
    wg.itinerary_index,
    wg.first_position,
    wg.kind,
    row_number() over (partition by wg.ordem_servico_id order by wg.first_position) - 1 as sequence_order,
    row_number() over (partition by wg.ordem_servico_id, wg.kind order by wg.first_position) as ordinal
  from waypoint_groups wg
), cycles as (
  select
    og.ordem_servico_id,
    jsonb_agg(
      jsonb_build_object(
        'itineraryIndex', og.itinerary_index,
        'sequenceOrder', og.sequence_order,
        'kind', og.kind,
        'ordinal', og.ordinal,
        'state', 'pending',
        'messageSentAt', null,
        'acceptedAt', null,
        'startedAt', null,
        'finishedAt', null,
        'kmInitial', null,
        'kmFinal', null
      )
      order by og.sequence_order
    ) as cycles_json
  from ordered_groups og
  group by og.ordem_servico_id
)
update public.ordens_servico o
set driver_operation_cycles = coalesce(cycles.cycles_json, '[]'::jsonb),
    current_driver_cycle_index = case when cycles.cycles_json is null then null else 0 end
from cycles
where o.id = cycles.ordem_servico_id;

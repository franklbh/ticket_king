-- Enforce public slot business hours.
--
-- Safe to re-run. This makes existing slots bookable only when the full
-- session fits inside business hours:
--   Sunday-Thursday: 10:00 through 19:00
--   Friday-Saturday: 10:00 through 20:00

with classified_slots as (
  select
    id,
    case
      when start_time >= time '10:00'
        and end_time is not null
        and end_time > start_time
        and end_time <= case
          when extract(isodow from business_date) in (5, 6) then time '20:00'
          else time '19:00'
        end
      then 'active'
      else 'archived'
    end as next_status
  from public.slots
)
update public.slots s
set
  status = c.next_status,
  updated_at = now()
from classified_slots c
where s.id = c.id
  and lower(coalesce(s.status, '')) <> c.next_status;

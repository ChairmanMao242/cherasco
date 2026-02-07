create extension if not exists "pgcrypto";

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  address text not null,
  postal_code text not null,
  city text not null,
  province text not null,
  created_at timestamptz not null default now(),
  unique (email, phone)
);

create table if not exists public.spins (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id),
  spin_date date not null,
  result text not null,
  prize text,
  created_at timestamptz not null default now(),
  unique (player_id, spin_date)
);

create table if not exists public.daily_slots (
  id uuid primary key default gen_random_uuid(),
  slot_time timestamptz not null,
  slot_date date not null,
  is_claimed boolean not null default false,
  claimed_at timestamptz,
  prize text,
  created_at timestamptz not null default now()
);

create index if not exists daily_slots_date_idx on public.daily_slots (slot_date);
create index if not exists daily_slots_claimed_idx on public.daily_slots (slot_date, is_claimed, slot_time);

create or replace function public.seed_daily_slots(p_day date)
returns void
language plpgsql
security definer
as $$
declare
  i int;
  v_slot timestamptz;
begin
  if exists (select 1 from public.daily_slots where slot_date = p_day) then
    return;
  end if;

  for i in 1..50 loop
    v_slot := (p_day::timestamp + interval '8 hours' + (random() * interval '12 hours')) at time zone 'Europe/Rome';
    insert into public.daily_slots (slot_time, slot_date)
    values (v_slot, p_day);
  end loop;
end;
$$;

create or replace function public.seed_slots_range(p_start date, p_days int)
returns void
language plpgsql
security definer
as $$
declare
  i int;
begin
  for i in 0..(p_days - 1) loop
    perform public.seed_daily_slots(p_start + i);
  end loop;
end;
$$;

create or replace function public.spin_wheel(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_address text,
  p_postal_code text,
  p_city text,
  p_province text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_local_time time := (v_now at time zone 'Europe/Rome')::time;
  v_today date := (v_now at time zone 'Europe/Rome')::date;
  v_player_id uuid;
  v_slot record;
  v_prize text;
  v_prize_pool text[] := array['Tshirt', 'Cappellino', 'Portachiavi'];
begin
  if v_local_time < time '08:00' or v_local_time > time '20:00' then
    return jsonb_build_object('result', 'out_of_time');
  end if;

  if not exists (select 1 from public.daily_slots where slot_date = v_today) then
    return jsonb_build_object('result', 'no_slots');
  end if;

  insert into public.players (
    first_name,
    last_name,
    email,
    phone,
    address,
    postal_code,
    city,
    province
  ) values (
    p_first_name,
    p_last_name,
    lower(trim(p_email)),
    trim(p_phone),
    p_address,
    p_postal_code,
    p_city,
    p_province
  )
  on conflict (email, phone)
  do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    address = excluded.address,
    postal_code = excluded.postal_code,
    city = excluded.city,
    province = excluded.province
  returning id into v_player_id;

  if exists (
    select 1 from public.spins where player_id = v_player_id and spin_date = v_today
  ) then
    return jsonb_build_object('result', 'already_played');
  end if;

  select * into v_slot
  from public.daily_slots
  where slot_date = v_today
    and slot_time <= v_now
    and is_claimed = false
  order by slot_time asc
  limit 1
  for update skip locked;

  if v_slot is null then
    insert into public.spins (player_id, spin_date, result)
    values (v_player_id, v_today, 'lose');

    return jsonb_build_object('result', 'lose');
  end if;

  v_prize := v_prize_pool[1 + floor(random() * array_length(v_prize_pool, 1))::int];

  update public.daily_slots
  set is_claimed = true,
      claimed_at = v_now,
      prize = v_prize
  where id = v_slot.id;

  insert into public.spins (player_id, spin_date, result, prize)
  values (v_player_id, v_today, 'win', v_prize);

  return jsonb_build_object('result', 'win', 'prize', v_prize);
end;
$$;

alter table public.players enable row level security;
alter table public.spins enable row level security;
alter table public.daily_slots enable row level security;

revoke all on table public.players from anon, authenticated;
revoke all on table public.spins from anon, authenticated;
revoke all on table public.daily_slots from anon, authenticated;

grant execute on function public.spin_wheel(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to anon, authenticated;

grant execute on function public.seed_daily_slots(date) to service_role;

grant execute on function public.seed_slots_range(date, int) to service_role;

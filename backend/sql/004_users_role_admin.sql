-- Normalize public.users.role values for the admin API.
-- Owner is created by bootstrap, owners create admins, customers stay customers.
-- Safe to re-run.

update public.users
set role = 'administrator'
where role = 'admin';

alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role in ('owner', 'administrator', 'customer'));

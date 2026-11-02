create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(btrim(nickname)) between 1 and 24),
  content text not null check (char_length(btrim(content)) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

drop policy if exists "Anyone can read chat messages" on public.chat_messages;
create policy "Anyone can read chat messages"
  on public.chat_messages
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can send chat messages" on public.chat_messages;
create policy "Anyone can send chat messages"
  on public.chat_messages
  for insert
  to anon, authenticated
  with check (
    char_length(btrim(nickname)) between 1 and 24
    and char_length(btrim(content)) between 1 and 500
  );

grant usage on schema public to anon, authenticated;
grant select, insert on public.chat_messages to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
end
$$;

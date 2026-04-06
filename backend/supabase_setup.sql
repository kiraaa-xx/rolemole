-- Users table
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  display_name text,
  pronouns text,
  gender text,
  pfp_url text,
  created_at timestamp with time zone default now()
);

-- Characters table
create table if not exists characters (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  pronouns text,
  gender text,
  genre text,
  pfp_url text,
  short_description text,
  personality text,
  backstory text,
  intro_message text,
  writing_style text,
  chat_count integer default 0,
  created_at timestamp with time zone default now()
);

-- Enable public read access
alter table characters enable row level security;
alter table users enable row level security;

create policy "Public read characters" on characters for select using (true);
create policy "Public read users" on users for select using (true);
create policy "Public insert users" on users for insert with check (true);
create policy "Public update users" on users for update using (true);
create policy "Service role all characters" on characters for all using (true);
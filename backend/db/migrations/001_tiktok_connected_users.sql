-- Bảng lưu các username TikTok đã từng connect thành công.
create table if not exists public.tiktok_connected_users (
  id            bigserial primary key,
  username      text        not null unique,
  connected_at  timestamptz not null default now(),
  last_seen     timestamptz not null default now()
);

create index if not exists tiktok_connected_users_last_seen_idx
  on public.tiktok_connected_users (last_seen desc);

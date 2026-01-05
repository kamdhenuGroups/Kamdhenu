create table public.users (
  user_id text not null,
  full_name text not null,
  designation text null,
  department text null,
  date_of_birth date null,
  gender text null,
  email text null,
  phone_number text null,
  current_address text null,
  username text not null,
  password text not null,
  role text null,
  is_active boolean null default true,
  profile_picture text null,

  created_at timestamp without time zone
  default (now() at time zone 'Asia/Kolkata'),

  page_access text[] null default '{}'::text[],

  constraint users_pkey primary key (user_id),
  constraint users_username_key unique (username)
) TABLESPACE pg_default;

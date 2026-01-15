-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.leads (
  lead_id text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  lead_source_user_id text NOT NULL,
  lead_source_user_name text NOT NULL,
  quotation text,
  lead_status text NOT NULL DEFAULT 'New'::text,
  remarks text,
  state text,
  city text,
  created_at timestamp without time zone NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
  updated_at timestamp without time zone,
  CONSTRAINT leads_pkey PRIMARY KEY (lead_id),
  CONSTRAINT leads_lead_source_user_fkey FOREIGN KEY (lead_source_user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.orders (
  order_id text NOT NULL,
  contractor_id text NOT NULL,
  site_id text NOT NULL,
  order_date date NOT NULL,
  challan_reference text,
  contractor_name text NOT NULL,
  customer_type text,
  customer_phone text,
  site_contact_number text,
  state text,
  city text,
  delivery_address text,
  total_amount numeric DEFAULT 0.00,

  logistics_mode text,
  payment_terms text,
  manual_payment_days integer,
  remarks text,
  order_status text DEFAULT 'Pending'::text,
  payment_status text DEFAULT 'Pending'::text,
  nickname text,
  mistry_name text,
  created_by_user_id text NOT NULL,
  created_by_user_name text NOT NULL,
  created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
  CONSTRAINT orders_pkey PRIMARY KEY (order_id),
  CONSTRAINT orders_created_by_user_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.payments (
  payment_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id text NOT NULL UNIQUE,
  order_amount numeric NOT NULL,
  paid_amount numeric DEFAULT 0.00,
  actual_payment_date date,
  payment_mode text,
  transaction_reference text,
  payment_status text DEFAULT 'Pending'::text,
  remarks text,
  created_by_user_id text,
  created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
  updated_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
  payment_proof text,
  due_date date,
  total_days integer,
  CONSTRAINT payments_pkey PRIMARY KEY (payment_id),
  CONSTRAINT payments_order_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
  CONSTRAINT payments_created_by_user_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.points_allocation (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id text NOT NULL,
  person_name text NOT NULL,
  role text NOT NULL,
  phone_last_4 character NOT NULL CHECK (phone_last_4 ~ '^[0-9]{4}$'::text),
  allocated_points integer NOT NULL CHECK (allocated_points >= 0),
  created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
  CONSTRAINT points_allocation_pkey PRIMARY KEY (id),
  CONSTRAINT fk_points_order FOREIGN KEY (order_id) REFERENCES public.orders(order_id)
);
CREATE TABLE public.products (
  product_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id text NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0.00,
  reward_points integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
  CONSTRAINT products_pkey PRIMARY KEY (product_id),
  CONSTRAINT products_order_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id)
);
CREATE TABLE public.users (
  user_id text NOT NULL,
  full_name text NOT NULL,
  designation text,
  department text,
  date_of_birth date,
  gender text,
  email text,
  phone_number text,
  current_address text,
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  role text,
  is_active boolean DEFAULT true,
  profile_picture text,
  created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
  page_access ARRAY DEFAULT '{}'::text[],
  CONSTRAINT users_pkey PRIMARY KEY (user_id)
);

create table public.contractor_data (
  contractor_id text not null,
  contractor_name text null,
  customer_phone numeric null,
  nickname text null,
  customer_type text not null,
  state text null,
  city text null,
  constraint contractor_data_pkey primary key (contractor_id),
  constraint contractor_data_contractor_id_key unique (contractor_id),
  constraint contractor_data_nickname_key unique (nickname)
) TABLESPACE pg_default;

create table public.customers (
  customer_id text not null,
  customer_name text not null,
  primary_phone text not null,
  secondary_phone text null,
  email text null,
  gst_number text null,
  is_gst_registered boolean default false,
  pan_number text null,
  billing_address_line text not null,
  billing_area text null,
  billing_locality text null,
  billing_city text not null,
  billing_state text not null,

  created_by_user_id text not null,
  customer_status text not null default 'Active'::text,
  created_at timestamp with time zone not null default timezone ('Asia/Kolkata'::text, now()),
  updated_at timestamp with time zone not null default timezone ('Asia/Kolkata'::text, now()),
  constraint customers_pkey primary key (customer_id),
  constraint unique_email unique (email),
  constraint unique_pan unique (pan_number),
  constraint unique_primary_phone unique (primary_phone),
  constraint unique_gst unique (gst_number),
  constraint fk_customer_created_by foreign KEY (created_by_user_id) references users (user_id) on delete RESTRICT,
  constraint customers_customer_status_check check (
    (
      customer_status = any (
        array[
          'Active'::text,
          'Inactive'::text,
          'Blacklisted'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;


create table public.sites (
  site_id text not null,
  address_plot_house_flat_building text not null,
  address_area_street_locality text not null,
  address_landmark text null,
  city text not null,
  state text not null,
  map_link text null,
  onsite_contact_name text not null,
  onsite_contact_mobile text not null,
  main_influencer_status text null,
  secondary_influencer_status text null,
  created_by_user_id text not null,
  created_at timestamp without time zone null default (now() AT TIME ZONE 'Asia/Kolkata'::text),
  updated_at timestamp without time zone null default (now() AT TIME ZONE 'Asia/Kolkata'::text),
  constraint sites_pkey primary key (site_id),
  constraint sites_created_by_user_id_fkey foreign KEY (created_by_user_id) references users (user_id),
  constraint sites_main_influencer_status_check check (
    (
      main_influencer_status = any (array['Old'::text, 'New'::text])
    )
  ),
  constraint sites_secondary_influencer_status_check check (
    (
      secondary_influencer_status = any (array['Old'::text, 'New'::text])
    )
  )
) TABLESPACE pg_default;

create table public.cac (
  id bigint generated always as identity not null,
  contractor_id text not null,
  user_id text not null,
  amount numeric(12, 2) not null,
  reimbursed_amount numeric(12, 2) not null default 0,
  reimbursement_status text not null default 'Pending'::text,
  customer_status text not null,
  expense_category text null,
  bill_image_url text null,
  expense_date date not null,
  last_reimbursed_at timestamp with time zone null,
  reimbursed_at timestamp with time zone null,
  remarks text null,
  created_at timestamp with time zone not null default timezone ('Asia/Kolkata'::text, now()),
  updated_at timestamp with time zone not null default timezone ('Asia/Kolkata'::text, now()),
  constraint cac_pkey primary key (id),
  constraint cac_contractor_fkey foreign KEY (contractor_id) references contractor_data (contractor_id),
  constraint cac_user_fkey foreign KEY (user_id) references users (user_id),
  constraint cac_customer_status_check check (
    (
      customer_status = any (array['Existing'::text, 'New'::text])
    )
  ),
  constraint cac_amount_check check ((amount > (0)::numeric)),
  constraint cac_reimbursed_amount_check check ((reimbursed_amount >= (0)::numeric)),
  constraint cac_reimbursement_status_check check (
    (
      reimbursement_status = any (
        array[
          'Pending'::text,
          'Partial'::text,
          'Reimbursed'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;


create table public.user_contractor_access (
  id bigserial not null,
  user_id text not null,
  contractor_id text not null,
  can_view boolean null default true,
  can_edit boolean null default false,
  granted_by text null,
  granted_at timestamp with time zone null default timezone ('Asia/Kolkata'::text, now()),
  revoked_at timestamp with time zone null,
  constraint user_contractor_access_pkey primary key (id),
  constraint unique_user_contractor unique (user_id, contractor_id),
  constraint fk_contractor foreign KEY (contractor_id) references contractor_data (contractor_id) on delete CASCADE,
  constraint fk_user foreign KEY (user_id) references users (user_id) on delete CASCADE
) TABLESPACE pg_default;
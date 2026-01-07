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
  point_of_contact_role text,
  logistics_mode text,
  payment_terms text,
  manual_payment_days integer,
  remarks text,
  order_status text DEFAULT 'Pending'::text,
  nickname text,
  mistry_name text,
  created_by_user_id text NOT NULL,
  created_by_user_name text NOT NULL,
  created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
  CONSTRAINT orders_pkey PRIMARY KEY (order_id),
  CONSTRAINT orders_created_by_user_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id)
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


-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.cac (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  contractor_id text NOT NULL,
  user_id text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  reimbursed_amount numeric NOT NULL DEFAULT 0 CHECK (reimbursed_amount >= 0::numeric),
  reimbursement_status text NOT NULL DEFAULT 'Pending'::text CHECK (reimbursement_status = ANY (ARRAY['Pending'::text, 'Partial'::text, 'Reimbursed'::text])),

  expense_category text,
  other_expense_category text,
  location text,

  expense_date date NOT NULL,
  last_reimbursed_at timestamp with time zone,
  reimbursed_at timestamp with time zone,
  remarks text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('Asia/Kolkata'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('Asia/Kolkata'::text, now()),
  CONSTRAINT cac_pkey PRIMARY KEY (id),
  CONSTRAINT cac_contractor_fkey FOREIGN KEY (contractor_id) REFERENCES public.contractor_data(contractor_id),
  CONSTRAINT cac_user_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.cac_bills (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  cac_id bigint NOT NULL,
  bill_url text NOT NULL,
  file_name text,
  file_type text,
  uploaded_by text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('Asia/Kolkata'::text, now()),
  CONSTRAINT cac_bills_pkey PRIMARY KEY (id),
  CONSTRAINT fk_cac FOREIGN KEY (cac_id) REFERENCES public.cac(id)
);
CREATE TABLE public.contractor_data (
  contractor_id text NOT NULL UNIQUE,
  contractor_name text,
  customer_phone numeric,
  nickname text UNIQUE,
  customer_type text NOT NULL,
  state text,
  city text,
  mistry_name text,
  CONSTRAINT contractor_data_pkey PRIMARY KEY (contractor_id)
);
CREATE TABLE public.customers (
  customer_id text NOT NULL,
  customer_name text NOT NULL,
  primary_phone text NOT NULL UNIQUE,
  secondary_phone text,
  email text UNIQUE,
  gst_number text UNIQUE,
  pan_number text UNIQUE,
  billing_address_line text NOT NULL,
  billing_area text,
  billing_locality text,
  billing_city text NOT NULL,
  billing_state text NOT NULL,
  created_by_user_id text NOT NULL,
  customer_status text NOT NULL DEFAULT 'Active'::text CHECK (customer_status = ANY (ARRAY['Active'::text, 'Inactive'::text, 'Blacklisted'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('Asia/Kolkata'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('Asia/Kolkata'::text, now()),
  is_gst_registered boolean DEFAULT false,
  CONSTRAINT customers_pkey PRIMARY KEY (customer_id),
  CONSTRAINT fk_customer_created_by FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id)
);
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
  order_id text NOT NULL UNIQUE,
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
  nickname text,
  mistry_name text,
  created_by_user_id text NOT NULL,
  created_by_user_name text NOT NULL,
  created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
  payment_status text DEFAULT 'Pending'::text,
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
  phone_last_5 character NOT NULL CHECK (phone_last_5 ~ '^[0-9]{5}$'::text),
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
CREATE TABLE public.sites (
  site_id text NOT NULL,
  address_plot_house_flat_building text NOT NULL,
  address_area_street_locality text NOT NULL,
  address_landmark text,
  city text NOT NULL,
  state text NOT NULL,
  map_link text,
  onsite_contact_name text NOT NULL,
  onsite_contact_mobile text NOT NULL,
  main_influencer_status text CHECK (main_influencer_status = ANY (ARRAY['Old'::text, 'New'::text])),
  secondary_influencer_status text CHECK (secondary_influencer_status = ANY (ARRAY['Old'::text, 'New'::text])),
  created_by_user_id text NOT NULL,
  created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
  updated_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
  CONSTRAINT sites_pkey PRIMARY KEY (site_id),
  CONSTRAINT sites_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.user_contractor_access (
  id bigint NOT NULL DEFAULT nextval('user_contractor_access_id_seq'::regclass),
  user_id text NOT NULL,
  contractor_id text NOT NULL,
  can_view boolean DEFAULT true,
  can_edit boolean DEFAULT false,
  granted_by text,
  granted_at timestamp with time zone DEFAULT timezone('Asia/Kolkata'::text, now()),
  revoked_at timestamp with time zone,
  CONSTRAINT user_contractor_access_pkey PRIMARY KEY (id),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT fk_contractor FOREIGN KEY (contractor_id) REFERENCES public.contractor_data(contractor_id)
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
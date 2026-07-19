-- ============================================================
-- Zack Zack Rechnung — Initiales Datenbankschema
-- 7 Tabellen, shared-schema multi-tenant via company_id + RLS
-- Geld immer als integer cents
-- ============================================================

-- ------------------------------------------------------------
-- ENUMs
-- ------------------------------------------------------------

create type document_type_enum as enum ('invoice', 'quote');

-- Status bewusst minimal für MVP; Phase 2 erweitert um Mahnung/Storno etc.
create type document_status_enum as enum ('draft', 'finalized', 'sent');

create type surcharge_type_enum as enum ('percent', 'fixed');

-- ------------------------------------------------------------
-- Hilfsfunktion: updated_at automatisch pflegen
-- ------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 1) companies
-- ------------------------------------------------------------

create table companies (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  legal_form          text,
  street              text,
  street_no           text,
  postcode            text,
  city                text,
  phone               text,
  mobile              text,
  fax                 text,
  email               text,
  director            text,
  steuernummer        text,
  ust_id              text,
  registergericht     text,
  handelsregister_nr  text,
  kleinunternehmer    boolean not null default true,
  default_tax_rate    smallint not null default 19 check (default_tax_rate in (0, 7, 19)),
  bank_name           text,
  iban                text,
  bic                 text,
  account_holder      text,
  logo_url            text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger companies_set_updated_at
  before update on companies
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- 2) users
-- id = auth.users.id (Supabase Auth), email nur Login-Identifier, kein FK-Ziel
-- ------------------------------------------------------------

create table users (
  id          uuid primary key references auth.users(id) on delete cascade,
  company_id  uuid not null references companies(id) on delete cascade,
  email       text not null,
  created_at  timestamptz not null default now()
);

create index idx_users_company_id on users(company_id);

-- ------------------------------------------------------------
-- 3) customers
-- ------------------------------------------------------------

create table customers (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null,
  street      text,
  street_no   text,
  postcode    text,
  city        text,
  email       text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_customers_company_id on customers(company_id);

create trigger customers_set_updated_at
  before update on customers
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- 4) services (Leistungskatalog)
-- ------------------------------------------------------------

create table services (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  description_de  text not null,
  description_tr  text,
  description_ar  text,
  unit            text,
  default_price   integer,  -- cents
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_services_company_id on services(company_id);

create trigger services_set_updated_at
  before update on services
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- 5) documents
-- document_number ist NULL bis zur Finalisierung (siehe Funktion unten)
-- ------------------------------------------------------------

create table documents (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references companies(id) on delete cascade,
  customer_id         uuid not null references customers(id) on delete restrict,
  created_by          uuid not null references users(id) on delete restrict,
  document_type       document_type_enum not null,
  document_number     text,
  status              document_status_enum not null default 'draft',
  issue_date          date,
  service_date        date,
  customer_snapshot   jsonb not null,
  subtotal_amount     integer not null default 0,  -- netto cents
  tax_amount          integer not null default 0,  -- cents
  total_amount        integer not null default 0,  -- brutto cents
  is_kleinunternehmer boolean not null,             -- Snapshot von companies.kleinunternehmer
  default_tax_rate    smallint not null default 19 check (default_tax_rate in (0, 7, 19)),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_documents_company_id on documents(company_id);
create index idx_documents_customer_id on documents(customer_id);
create index idx_documents_created_by on documents(created_by);

-- Keine doppelten Rechnungsnummern pro Firma (NULL erlaubt = Entwurf)
create unique index uq_documents_company_number
  on documents(company_id, document_number)
  where document_number is not null;

create trigger documents_set_updated_at
  before update on documents
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- 6) document_items
-- company_id redundant für simple RLS-Policy (statt Join über documents)
-- service_id nur Referenz, NICHT live verknüpft (Snapshot-Prinzip)
-- ------------------------------------------------------------

create table document_items (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references documents(id) on delete cascade,
  company_id      uuid not null references companies(id) on delete cascade,
  service_id      uuid references services(id) on delete set null,
  position        integer not null,
  description_de  text not null,
  amount          numeric(10,2) not null,  -- Menge, z.B. 12.50 m²
  unit            text,
  unit_price      integer not null,        -- cents
  total_amount    integer not null,        -- netto cents
  tax_rate        smallint not null check (tax_rate in (0, 7, 19)),
  tax_rate_overridden boolean not null default false,
  tax_amount      integer not null,        -- cents, pro Zeile gerundet
  gross_amount    integer not null,        -- cents
  purchase_price  integer,                 -- cents, nur bei Fremdleistung
  surcharge       integer,                 -- Bedeutung abhängig von surcharge_type
  surcharge_type  surcharge_type_enum,
  created_at      timestamptz not null default now(),

  -- surcharge und surcharge_type immer zusammen (beide null oder beide gesetzt)
  constraint chk_surcharge_pair check (
    (surcharge is null and surcharge_type is null) or
    (surcharge is not null and surcharge_type is not null)
  ),
  -- Aufschlag nur bei Fremdleistung (= purchase_price gesetzt)
  constraint chk_surcharge_requires_purchase check (
    surcharge is null or purchase_price is not null
  ),
  constraint chk_document_item_tax_totals check (
    amount > 0 and unit_price >= 0 and total_amount >= 0
    and tax_amount >= 0 and gross_amount = total_amount + tax_amount
  )
);

-- surcharge-Interpretation:
--   surcharge_type = 'fixed'   -> surcharge in cents
--   surcharge_type = 'percent' -> surcharge in Basispunkten (1/100 %), z.B. 1250 = 12,50%

create index idx_document_items_document_id on document_items(document_id);
create index idx_document_items_company_id on document_items(company_id);
create index idx_document_items_service_id on document_items(service_id);

-- ------------------------------------------------------------
-- 7) number_sequences
-- Composite PK, last_number wird atomar über Funktion erhöht
-- ------------------------------------------------------------

create table number_sequences (
  company_id      uuid not null references companies(id) on delete cascade,
  document_type   document_type_enum not null,
  year            integer not null,
  last_number     integer not null default 0,
  primary key (company_id, document_type, year)
);

-- ------------------------------------------------------------
-- Atomare Rechnungs-/Angebotsnummer-Vergabe
-- UPDATE sperrt die Zeile implizit (äquivalent zu SELECT ... FOR UPDATE)
-- ------------------------------------------------------------

create or replace function get_next_document_number(
  p_company_id    uuid,
  p_document_type document_type_enum,
  p_year          integer
)
returns integer
language plpgsql
security definer
as $$
declare
  v_next integer;
begin
  insert into number_sequences (company_id, document_type, year, last_number)
  values (p_company_id, p_document_type, p_year, 0)
  on conflict (company_id, document_type, year) do nothing;

  update number_sequences
  set last_number = last_number + 1
  where company_id = p_company_id
    and document_type = p_document_type
    and year = p_year
  returning last_number into v_next;

  return v_next;
end;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

create or replace function get_user_company_id()
returns uuid
language sql
security definer
stable
as $$
  select company_id from public.users where id = auth.uid();
$$;

alter table companies        enable row level security;
alter table users            enable row level security;
alter table customers        enable row level security;
alter table services         enable row level security;
alter table documents        enable row level security;
alter table document_items   enable row level security;
alter table number_sequences enable row level security;

-- companies: Zugriff nur auf die eigene Firma
create policy companies_select on companies
  for select using (id = get_user_company_id());

create policy companies_update on companies
  for update using (id = get_user_company_id());

-- Onboarding-Sonderfall: Insert erlaubt, solange der Auth-User noch
-- keiner Firma zugeordnet ist (verhindert beliebiges Nachträglich-Anlegen).
-- TODO Phase 2: Mitarbeiter-Einladung in bestehende Firma braucht eigene Policy.
create policy companies_insert_onboarding on companies
  for insert with check (
    auth.uid() is not null
    and not exists (select 1 from public.users where id = auth.uid())
  );

-- users
create policy users_select on users
  for select using (company_id = get_user_company_id());

-- Eigene Zeile beim Onboarding anlegen
-- TODO Phase 2: absichern, dass company_id nur die selbst gerade erstellte Firma sein kann
create policy users_insert_self on users
  for insert with check (id = auth.uid());

-- customers / services / documents / document_items / number_sequences:
-- einheitliches Muster, volle CRUD-Berechtigung innerhalb der eigenen Firma
create policy customers_all on customers
  for all using (company_id = get_user_company_id())
  with check (company_id = get_user_company_id());

create policy services_all on services
  for all using (company_id = get_user_company_id())
  with check (company_id = get_user_company_id());

create policy documents_all on documents
  for all using (company_id = get_user_company_id())
  with check (company_id = get_user_company_id());

create policy document_items_all on document_items
  for all using (company_id = get_user_company_id())
  with check (company_id = get_user_company_id());

create policy number_sequences_all on number_sequences
  for all using (company_id = get_user_company_id())
  with check (company_id = get_user_company_id());

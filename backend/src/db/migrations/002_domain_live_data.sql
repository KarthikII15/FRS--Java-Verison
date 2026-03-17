create table if not exists hr_department (
  pk_department_id bigserial primary key,
  tenant_id bigint not null references frs_tenant(pk_tenant_id),
  name varchar(150) not null,
  code varchar(30) not null,
  color varchar(20),
  unique (tenant_id, code)
);

create table if not exists hr_shift (
  pk_shift_id bigserial primary key,
  tenant_id bigint not null references frs_tenant(pk_tenant_id),
  name varchar(120) not null,
  shift_type varchar(30) not null check (shift_type in ('morning', 'evening', 'night', 'flexible')),
  start_time time,
  end_time time,
  grace_period_minutes int not null default 10,
  is_flexible boolean not null default false
);

create table if not exists hr_employee (
  pk_employee_id bigserial primary key,
  tenant_id bigint not null references frs_tenant(pk_tenant_id),
  customer_id bigint references frs_customer(pk_customer_id),
  site_id bigint references frs_site(pk_site_id),
  unit_id bigint references frs_unit(pk_unit_id),
  fk_department_id bigint references hr_department(pk_department_id),
  fk_shift_id bigint references hr_shift(pk_shift_id),
  employee_code varchar(40) not null,
  full_name varchar(180) not null,
  email varchar(320) not null,
  position_title varchar(180) not null,
  location_label varchar(180),
  status varchar(20) not null check (status in ('active', 'inactive', 'on-leave')),
  join_date date not null,
  phone_number varchar(40),
  created_at timestamptz not null default now(),
  unique (tenant_id, employee_code),
  unique (tenant_id, email)
);

create table if not exists attendance_record (
  pk_attendance_id bigserial primary key,
  tenant_id bigint not null references frs_tenant(pk_tenant_id),
  customer_id bigint references frs_customer(pk_customer_id),
  site_id bigint references frs_site(pk_site_id),
  unit_id bigint references frs_unit(pk_unit_id),
  fk_employee_id bigint not null references hr_employee(pk_employee_id),
  attendance_date date not null,
  check_in timestamptz,
  check_out timestamptz,
  break_start timestamptz,
  break_end timestamptz,
  status varchar(20) not null check (status in ('present', 'late', 'absent', 'on-leave', 'on-break')),
  working_hours numeric(8,2) not null default 0,
  break_duration_minutes int not null default 0,
  overtime_hours numeric(8,2) not null default 0,
  is_late boolean not null default false,
  is_early_departure boolean not null default false,
  device_id varchar(80),
  location_label varchar(180),
  recognition_accuracy numeric(5,2),
  created_at timestamptz not null default now(),
  unique (tenant_id, fk_employee_id, attendance_date)
);

create table if not exists facility_device (
  pk_device_id bigserial primary key,
  tenant_id bigint not null references frs_tenant(pk_tenant_id),
  customer_id bigint references frs_customer(pk_customer_id),
  site_id bigint references frs_site(pk_site_id),
  unit_id bigint references frs_unit(pk_unit_id),
  external_device_id varchar(80) not null,
  name varchar(200) not null,
  location_label varchar(200) not null,
  ip_address varchar(64) not null,
  status varchar(20) not null check (status in ('online', 'offline', 'error')),
  recognition_accuracy numeric(5,2) not null default 0,
  total_scans int not null default 0,
  error_rate numeric(5,2) not null default 0,
  model varchar(120),
  last_active timestamptz not null default now(),
  unique (tenant_id, external_device_id)
);

create table if not exists system_alert (
  pk_alert_id bigserial primary key,
  tenant_id bigint not null references frs_tenant(pk_tenant_id),
  customer_id bigint references frs_customer(pk_customer_id),
  site_id bigint references frs_site(pk_site_id),
  unit_id bigint references frs_unit(pk_unit_id),
  alert_type varchar(80) not null,
  severity varchar(20) not null check (severity in ('low', 'medium', 'high', 'critical')),
  title varchar(220),
  message text not null,
  fk_employee_id bigint references hr_employee(pk_employee_id),
  fk_device_id bigint references facility_device(pk_device_id),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  pk_audit_id bigserial primary key,
  tenant_id bigint not null references frs_tenant(pk_tenant_id),
  customer_id bigint references frs_customer(pk_customer_id),
  site_id bigint references frs_site(pk_site_id),
  unit_id bigint references frs_unit(pk_unit_id),
  fk_user_id bigint references frs_user(pk_user_id),
  action varchar(120) not null,
  details text not null,
  ip_address varchar(64),
  created_at timestamptz not null default now()
);

create index if not exists idx_employee_scope
  on hr_employee(tenant_id, customer_id, site_id, unit_id);
create index if not exists idx_shift_tenant
  on hr_shift(tenant_id);
create index if not exists idx_attendance_scope_date
  on attendance_record(tenant_id, site_id, attendance_date desc);
create index if not exists idx_attendance_employee_date
  on attendance_record(fk_employee_id, attendance_date desc);
create index if not exists idx_device_scope_status
  on facility_device(tenant_id, site_id, status);
create index if not exists idx_alert_scope_created
  on system_alert(tenant_id, site_id, created_at desc);
create index if not exists idx_audit_scope_created
  on audit_log(tenant_id, created_at desc);


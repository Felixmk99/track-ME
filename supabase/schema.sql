-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Health Metrics Table
create table if not exists health_metrics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  symptom_score float, -- Composite Score (Sum Symptoms - Sum Exertion). No Range Limit.
  hrv float,
  resting_heart_rate int,
  step_count int, -- Daily Step Count from Apple Health
  exertion_score float,
  custom_metrics jsonb, -- Flexible storage for user-defined trackers
  raw_data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure one record per date per user to prevent duplicates
  unique(user_id, date)
);

-- Experiments Table
create table if not exists experiments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  start_date date not null,
  end_date date,
  category text check (category in ('medication', 'supplement', 'lifestyle', 'other')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS) Policies
alter table health_metrics enable row level security;
alter table experiments enable row level security;

-- Health Metrics Policies
create policy "Users can view their own health metrics"
  on health_metrics for select
  using (auth.uid() = user_id);

create policy "Users can check their own health metrics"
  on health_metrics for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own health metrics"
  on health_metrics for update
  using (auth.uid() = user_id);

create policy "Users can delete their own health metrics"
  on health_metrics for delete
  using (auth.uid() = user_id);

-- Experiments Policies
create policy "Users can view their own experiments"
  on experiments for select
  using (auth.uid() = user_id);

create policy "Users can create their own experiments"
  on experiments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own experiments"
  on experiments for update
  using (auth.uid() = user_id);

create policy "Users can delete their own experiments"
  on experiments for delete
  using (auth.uid() = user_id);

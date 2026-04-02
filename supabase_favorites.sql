-- Create favorites table
create table favorites (
  user_id uuid references auth.users not null,
  product_id uuid references public.products not null,
  created_at timestamptz default now(),
  primary key (user_id, product_id)
);

-- RLS Policies
alter table favorites enable row level security;

create policy "Users can view their own favorites"
  on favorites for select
  using (auth.uid() = user_id);

create policy "Users can insert their own favorites"
  on favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own favorites"
  on favorites for delete
  using (auth.uid() = user_id);

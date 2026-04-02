-- Таблица чеков (Receipts)
create table
  public.receipts (
    id uuid not null default gen_random_uuid (),
    user_id uuid not null default auth.uid (),
    store_name text not null,
    total_amount numeric not null,
    purchase_date timestamp with time zone not null default now(),
    created_at timestamp with time zone not null default now(),
    constraint receipts_pkey primary key (id),
    constraint receipts_user_id_fkey foreign key (user_id) references profiles (id) on update cascade on delete cascade
  ) tablespace pg_default;

-- Таблица позиций чека (Receipt Items)
create table
  public.receipt_items (
    id uuid not null default gen_random_uuid (),
    receipt_id uuid not null,
    product_id uuid not null, -- Ссылка на товар из каталога (из таблицы products)
    product_name text not null, -- Сохраняем имя на случай, если товар удалят
    price numeric not null, -- Цена за единицу измерения
    quantity numeric not null, -- Количество (вес, объем, штуки)
    quantity_unit text not null, -- Единицы измерения (г, шт, мл, и т.д.)
    total_item_price numeric not null, -- Общая стоимость позиции (вычисляется в коде)
    created_at timestamp with time zone not null default now(),
    constraint receipt_items_pkey primary key (id),
    constraint receipt_items_receipt_id_fkey foreign key (receipt_id) references receipts (id) on update cascade on delete cascade,
    constraint receipt_items_product_id_fkey foreign key (product_id) references products (id) on delete restrict
  ) tablespace pg_default;

-- Включаем Row Level Security (RLS)
alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;

-- Политики для receipts (пользователь может видеть и редактировать только свои чеки)
create policy "Users can read own receipts"
  on public.receipts
  for select
  using (auth.uid () = user_id);

create policy "Users can insert own receipts"
  on public.receipts
  for insert
  with check (auth.uid () = user_id);

create policy "Users can update own receipts"
  on public.receipts
  for update
  using (auth.uid () = user_id);

create policy "Users can delete own receipts"
  on public.receipts
  for delete
  using (auth.uid () = user_id);

-- Политики для receipt_items
create policy "Users can read own receipt items"
  on public.receipt_items
  for select
  using (
    exists (
      select 1 from public.receipts
      where receipts.id = receipt_items.receipt_id
      and receipts.user_id = auth.uid()
    )
  );

create policy "Users can insert own receipt items"
  on public.receipt_items
  for insert
  with check (
    exists (
      select 1 from public.receipts
      where receipts.id = receipt_items.receipt_id
      and receipts.user_id = auth.uid()
    )
  );

create policy "Users can update own receipt items"
  on public.receipt_items
  for update
  using (
    exists (
      select 1 from public.receipts
      where receipts.id = receipt_items.receipt_id
      and receipts.user_id = auth.uid()
    )
  );

create policy "Users can delete own receipt items"
  on public.receipt_items
  for delete
  using (
    exists (
      select 1 from public.receipts
      where receipts.id = receipt_items.receipt_id
      and receipts.user_id = auth.uid()
    )
  );

-- Индексы для скорости работы
create index receipts_user_id_idx on public.receipts (user_id);
create index receipts_purchase_date_idx on public.receipts (purchase_date desc);
create index receipt_items_receipt_id_idx on public.receipt_items (receipt_id);

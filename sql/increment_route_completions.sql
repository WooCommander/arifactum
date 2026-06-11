-- Атомарный инкремент счётчика завершений маршрута
-- Выполнить в Supabase SQL Editor

CREATE OR REPLACE FUNCTION increment_route_completions(route_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE routes
  SET completions_count = COALESCE(completions_count, 0) + 1
  WHERE id = route_id;
$$;

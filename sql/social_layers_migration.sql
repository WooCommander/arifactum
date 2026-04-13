-- ==========================================
-- Artifactum: Social Layers Migration (v2.8.0)
-- ==========================================

-- 1. Обновляем таблицу routes
ALTER TABLE routes ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 2. Создаем таблицу лайков (Likes)
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  UNIQUE(user_id, route_id)
);

-- 3. Создаем таблицу избранного (Favorites)
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  UNIQUE(user_id, route_id)
);

-- 4. Создаем таблицу комментариев (Comments)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  content TEXT NOT NULL
);

-- 5. Включаем RLS (Row Level Security)
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 6. Политики безопасности (Policies)

-- Лайки: любой может видеть, только владелец может ставить/удалять
CREATE POLICY "Likes are viewable by everyone" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can toggle their own likes" ON likes FOR ALL USING (auth.uid() = user_id);

-- Избранное: только владелец видит и управляет
CREATE POLICY "Users can manage their favorites" ON favorites FOR ALL USING (auth.uid() = user_id);

-- Комментарии: любой видит, только автор пишет/удаляет
CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can post comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- 7. Добавляем индекс для ускорения поиска по категориям
CREATE INDEX IF NOT EXISTS idx_routes_category ON routes(category);

-- ==========================================
-- Artifactum: Full Database Setup (v2.9.0)
-- This script sets up EVERYTHING from scratch.
-- ==========================================

-- 1. Создаем таблицу профилей (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  gender TEXT,
  birth_date DATE,
  avatar_url TEXT,
  
  -- Игровые показатели
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  total_distance_meters INTEGER DEFAULT 0,
  total_seconds_spent INTEGER DEFAULT 0,
  routes_completed_count INTEGER DEFAULT 0
);

-- 2. Включаем RLS для профилей
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 3. Функция и Триггер для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, split_part(new.email, '@', 1));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Обновляем таблицу routes (поля категорий)
ALTER TABLE routes ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE routes ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- 5. Социальные таблицы (Likes, Favorites, Comments)
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  UNIQUE(user_id, route_id)
);

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  UNIQUE(user_id, route_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  content TEXT NOT NULL
);

-- 6. Геймификация (Achievements, Completions)
CREATE TABLE IF NOT EXISTS route_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  duration_seconds INTEGER NOT NULL,
  distance_meters INTEGER NOT NULL,
  avg_speed_kmh FLOAT
);

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  xp_reward INTEGER DEFAULT 100
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- 7. Включаем RLS для всех новых таблиц
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- 8. Базовые политики (упрощенная настройка)
CREATE POLICY "Public read for social" ON likes FOR SELECT USING (true);
CREATE POLICY "Auth toggle likes" ON likes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Own favorites" ON favorites FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Own comments manage" ON comments FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Own completions" ON route_completions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public achievements" ON achievements FOR SELECT USING (true);
CREATE POLICY "Own unlocked achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);

-- 9. Начальные данные
INSERT INTO achievements (code, title, description, icon, xp_reward) VALUES
('first_quest', 'Первооткрыватель', 'Завершите свой первый маршрут', '🏔️', 500),
('speed_demon', 'Демон скорости', 'Завершите маршрут быстрее среднего времени', '⚡', 300),
('marathoner', 'Марафонец', 'Пройдите суммарно более 10 км', '🏃', 1000)
ON CONFLICT (code) DO NOTHING;

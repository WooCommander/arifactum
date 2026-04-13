-- ==========================================
-- Artifactum: Game Feel Migration (v2.9.0)
-- ==========================================

-- 1. Расширяем профили пользователей для геймификации и статистики
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_distance_meters INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_seconds_spent INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS routes_completed_count INTEGER DEFAULT 0;

-- 2. Создаем таблицу для истории прохождения маршрутов (для статистики скорости)
CREATE TABLE IF NOT EXISTS route_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  duration_seconds INTEGER NOT NULL,
  distance_meters INTEGER NOT NULL,
  avg_speed_kmh FLOAT
);

-- 3. Таблица для достижений (Achievements)
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  xp_reward INTEGER DEFAULT 100
);

-- 4. Связь пользователей и достижений
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- 5. Включаем RLS
ALTER TABLE route_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- 6. Политики безопасности
CREATE POLICY "Users can see their own route completions" ON route_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own route completions" ON route_completions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Achievements are viewable by everyone" ON achievements FOR SELECT USING (true);

CREATE POLICY "Users can see their own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can grant achievements" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Базовые достижения (примеры)
INSERT INTO achievements (code, title, description, icon, xp_reward) VALUES
('first_quest', 'Первооткрыватель', 'Завершите свой первый маршрут', '🏔️', 500),
('speed_demon', 'Демон скорости', 'Завершите маршрут быстрее среднего времени', '⚡', 300),
('marathoner', 'Марафонец', 'Пройдите суммарно более 10 км', '🏃', 1000)
ON CONFLICT (code) DO NOTHING;

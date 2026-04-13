-- ==========================================
-- Artifactum: Museum Migration (v2.10.0)
-- ==========================================

-- 1. Таблица всех доступных в игре артефактов
CREATE TABLE IF NOT EXISTS public.artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  lore TEXT,
  rarity TEXT NOT NULL DEFAULT 'common', -- common, rare, epic, legendary
  image_url TEXT,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL
);

-- 2. Связующая таблица: какие артефакты найдены конкретным пользователем
CREATE TABLE IF NOT EXISTS public.user_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_id UUID REFERENCES public.artifacts(id) ON DELETE CASCADE,
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, artifact_id)
);

-- 3. Включаем RLS
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_artifacts ENABLE ROW LEVEL SECURITY;

-- 4. Политики безопасности
CREATE POLICY "Artifacts are viewable by everyone" ON public.artifacts FOR SELECT USING (true);
CREATE POLICY "Users can see their own collection" ON public.user_artifacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can grant artifacts to users" ON public.user_artifacts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Начальный набор артефактов (примеры)
-- Важно: мы свяжем их с маршрутами по мере их создания/наличия
INSERT INTO public.artifacts (name, description, lore, rarity, image_url) VALUES
('Древний Додекаэдр', 'Загадочный геометрический объект, излучающий мягкий синий свет.', 'Говорят, этот предмет выпал из сумки первого путешественника Artifactum.', 'common', 'https://placeholder.com/artifact1.png'),
('Кристалл Пустоты', 'Осколок метеорита, который искажает пространство вокруг себя.', 'Внутри кристалла можно увидеть звезды, которые не принадлежат нашему небу.', 'rare', 'https://placeholder.com/artifact2.png'),
('Золотой Компас Судьбы', 'Стрелка этого компаса всегда указывает на то, что вы ищете больше всего.', 'Этот артефакт принадлежал капитану, который не проиграл ни одного морского сражения.', 'epic', 'https://placeholder.com/artifact3.png'),
('Око Артефактора', 'Единственный в своем роде артефакт, позволяющий видеть скрытые части реальности.', 'Тот, кто владеет Оком, никогда не заблудится в лабиринтах времени.', 'legendary', 'https://placeholder.com/artifact4.png')
ON CONFLICT DO NOTHING;

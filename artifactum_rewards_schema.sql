-- Таблица наград и артефактов
CREATE TABLE IF NOT EXISTS public.user_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
    type TEXT CHECK (type IN ('bonus', 'artifact')) NOT NULL,
    amount INT DEFAULT 0,
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT
);

-- Включение RLS
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

-- Политики для user_rewards
CREATE POLICY "Users can view their own rewards" ON public.user_rewards
    FOR SELECT USING (auth.uid() = user_id);

-- Триггер для автоматического начисления бонусов при прохождении маршрута (опционально)
-- Пока будем делать через сервис для гибкости.

-- Таблица для хранения оперативных координат участников команд
CREATE TABLE IF NOT EXISTS public.team_locations (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    lat NUMERIC(10, 7) NOT NULL,
    lng NUMERIC(10, 7) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Включение RLS
ALTER TABLE public.team_locations ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
DROP POLICY IF EXISTS "Users can upsert their own location" ON public.team_locations;
CREATE POLICY "Users can upsert their own location" ON public.team_locations
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members can see teammate locations" ON public.team_locations;
CREATE POLICY "Members can see teammate locations" ON public.team_locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = team_locations.team_id
            AND team_members.user_id = auth.uid()
        )
    );

-- Включение Realtime для этой таблицы
ALTER PUBLICATION supabase_realtime ADD TABLE team_locations;

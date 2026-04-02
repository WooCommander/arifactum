-- Таблица команд
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    leader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    avatar_url TEXT
);

-- Таблица участников команд
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Включение RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Политики для teams
CREATE POLICY "Teams are viewable by members" ON public.teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.team_members 
            WHERE team_members.team_id = teams.id 
            AND team_members.user_id = auth.uid()
        )
        OR leader_id = auth.uid()
    );

CREATE POLICY "Users can create teams" ON public.teams
    FOR INSERT WITH CHECK (auth.uid() = leader_id);

-- Политики для team_members
CREATE POLICY "Members can see teammates" ON public.team_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.team_members AS self
            WHERE self.team_id = team_members.team_id 
            AND self.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join teams with invite code" ON public.team_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

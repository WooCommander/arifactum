-- Таблица пользовательских артефактов на чекпоинтах
CREATE TABLE IF NOT EXISTS public.checkpoint_artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    checkpoint_id UUID REFERENCES public.checkpoints(id) ON DELETE CASCADE,
    route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    rejection_reason TEXT
);

ALTER TABLE public.checkpoint_artifacts ENABLE ROW LEVEL SECURITY;

-- Все видят одобренные артефакты
CREATE POLICY "Approved artifacts are public" ON public.checkpoint_artifacts
    FOR SELECT USING (status = 'approved');

-- Авторы видят свои артефакты в любом статусе
CREATE POLICY "Users can see own artifacts" ON public.checkpoint_artifacts
    FOR SELECT USING (auth.uid() = user_id);

-- Только авторизованные могут отправлять
CREATE POLICY "Users can submit artifacts" ON public.checkpoint_artifacts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Авторы могут удалять свои pending-артефакты
CREATE POLICY "Users can delete own pending artifacts" ON public.checkpoint_artifacts
    FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

-- Только администраторы могут менять статус
CREATE POLICY "Admins can moderate artifacts" ON public.checkpoint_artifacts
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Bucket для артефактов нужно создать в Supabase Storage: "checkpoint-artifacts" (public)

-- Таблица маршрутов
CREATE TABLE IF NOT EXISTS public.routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    image_url TEXT,
    is_public BOOLEAN DEFAULT true,
    checkpoints_count INT DEFAULT 0,
    rating_avg NUMERIC(3, 2) DEFAULT 0
);

-- Таблица чекпоинтов (точек маршрута)
CREATE TABLE IF NOT EXISTS public.checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    lat NUMERIC(10, 7) NOT NULL,
    lng NUMERIC(10, 7) NOT NULL,
    photo_url TEXT,
    order_index INT NOT NULL
);

-- Включение RLS
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;

-- Политики для routes
CREATE POLICY "Public routes are viewable by everyone" ON public.routes
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can create their own routes" ON public.routes
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own routes" ON public.routes
    FOR UPDATE USING (auth.uid() = author_id);

-- Политики для checkpoints
CREATE POLICY "Checkpoints are viewable by everyone" ON public.checkpoints
    FOR SELECT USING (true);

CREATE POLICY "Authors can manage checkpoints" ON public.checkpoints
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.routes 
            WHERE routes.id = checkpoints.route_id 
            AND routes.author_id = auth.uid()
        )
    );

-- Пример данных (начиная с маршрута)
-- INSERT INTO public.routes (title, description, difficulty) 
-- VALUES ('Тайны старого города', 'Захватывающий квест по историческому центру', 'medium');

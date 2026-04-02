-- 1. Добавляем поле для фото товаров
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_url') THEN
        ALTER TABLE products ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- 2. Таблица для хранения очков в играх
CREATE TABLE IF NOT EXISTS public.game_scores (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL, -- 'memory', 'price_battle' и т.д.
    score INTEGER NOT NULL,
    difficulty TEXT, -- 'easy', 'medium', 'hard'
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT game_scores_pkey PRIMARY KEY (id)
);

-- Включаем RLS
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

-- Только чтение своих очков (или всех для лидерборда)
CREATE POLICY "Users can read all game scores" ON public.game_scores FOR SELECT USING (true);
CREATE POLICY "Users can insert own scores" ON public.game_scores FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. RPC для рейтинга по играм (лидерборд)
CREATE OR REPLACE FUNCTION leaderboard_games(p_limit integer DEFAULT 20)
RETURNS TABLE (user_id uuid, display_name text, products_count bigint, prices_count bigint, game_score bigint)
LANGUAGE sql SECURITY DEFINER AS $$
    SELECT
        u.id                 AS user_id,
        u.display_name       AS display_name,
        COALESCE(pc.cnt, 0)  AS products_count,
        COALESCE(prc.cnt, 0) AS prices_count,
        COALESCE(gs.total_score, 0) AS game_score
    FROM profiles u
    LEFT JOIN (
        SELECT created_by, COUNT(*) AS cnt FROM products GROUP BY created_by
    ) pc ON u.id = pc.created_by
    LEFT JOIN (
        SELECT created_by, COUNT(*) AS cnt FROM prices GROUP BY created_by
    ) prc ON u.id = prc.created_by
    INNER JOIN (
        SELECT user_id, SUM(score) AS total_score FROM game_scores GROUP BY user_id
    ) gs ON u.id = gs.user_id
    ORDER BY total_score DESC
    LIMIT p_limit;
$$;

-- 4. Получение случайных товаров для игр (решает проблему "всегда одни и те же")
CREATE OR REPLACE FUNCTION get_random_products(p_limit int)
RETURNS SETOF products AS $$
BEGIN
  RETURN QUERY SELECT * FROM products ORDER BY random() LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Также обновим остальные RPC, чтобы они возвращали корректные данные, если они вдруг не работают
-- (Оставляем как есть, если работают, но убеждаемся, что они существуют)

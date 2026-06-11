-- Creator Rating System Migration
-- Run in Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS creator_score INT NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS routes_published_count INT NOT NULL DEFAULT 0;

-- Recalculates creator_score and routes_published_count for a given user.
-- Formula: SUM per published route of (likes + completions*2 + rating*10)
CREATE OR REPLACE FUNCTION recalculate_creator_score(p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_score INT;
  v_count INT;
BEGIN
  SELECT
    COALESCE(SUM(
      COALESCE(likes_count, 0) +
      COALESCE(completions_count, 0) * 2 +
      ROUND(COALESCE(rating_avg, 0) * 10)::INT
    ), 0)::INT,
    COUNT(*)::INT
  INTO v_score, v_count
  FROM routes
  WHERE author_id = p_user_id AND status = 'published';

  UPDATE profiles
  SET creator_score = v_score,
      routes_published_count = v_count
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION recalculate_creator_score(UUID) TO authenticated;

-- Backfill existing published route authors
DO $$
DECLARE
  u UUID;
BEGIN
  FOR u IN SELECT DISTINCT author_id FROM routes WHERE status = 'published' AND author_id IS NOT NULL LOOP
    PERFORM recalculate_creator_score(u);
  END LOOP;
END;
$$;

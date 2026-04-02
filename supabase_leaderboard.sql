-- Leaderboard SQL functions
-- Run this in Supabase Studio > SQL Editor
-- Requires supabase_profiles.sql to be applied first

-- Top users by products created
CREATE OR REPLACE FUNCTION leaderboard_products(p_limit integer DEFAULT 20)
RETURNS TABLE (user_id uuid, display_name text, products_count bigint, prices_count bigint)
LANGUAGE sql SECURITY DEFINER AS $$
    SELECT
        pc.created_by        AS user_id,
        pr.display_name      AS display_name,
        pc.cnt               AS products_count,
        COALESCE(prc.cnt, 0) AS prices_count
    FROM (
        SELECT created_by, COUNT(*) AS cnt
        FROM products
        WHERE created_by IS NOT NULL
        GROUP BY created_by
        ORDER BY cnt DESC
        LIMIT p_limit
    ) pc
    LEFT JOIN profiles pr ON pc.created_by = pr.id
    LEFT JOIN (
        SELECT created_by, COUNT(*) AS cnt FROM prices GROUP BY created_by
    ) prc ON pc.created_by = prc.created_by;
$$;

-- Top users by prices submitted
CREATE OR REPLACE FUNCTION leaderboard_prices(p_limit integer DEFAULT 20)
RETURNS TABLE (user_id uuid, display_name text, products_count bigint, prices_count bigint)
LANGUAGE sql SECURITY DEFINER AS $$
    SELECT
        prc.created_by       AS user_id,
        pr.display_name      AS display_name,
        COALESCE(pc.cnt, 0)  AS products_count,
        prc.cnt              AS prices_count
    FROM (
        SELECT created_by, COUNT(*) AS cnt
        FROM prices
        WHERE created_by IS NOT NULL
        GROUP BY created_by
        ORDER BY cnt DESC
        LIMIT p_limit
    ) prc
    LEFT JOIN profiles pr ON prc.created_by = pr.id
    LEFT JOIN (
        SELECT created_by, COUNT(*) AS cnt FROM products GROUP BY created_by
    ) pc ON prc.created_by = pc.created_by;
$$;

-- Top users by reputation (products * 20 + prices * 5 + verification_points)
-- verification_points: +1 за каждый confirm на своих ценах, -1 за deny
DROP FUNCTION IF EXISTS leaderboard_reputation(integer);
CREATE FUNCTION leaderboard_reputation(p_limit integer DEFAULT 20)
RETURNS TABLE (user_id uuid, display_name text, products_count bigint, prices_count bigint, reputation bigint)
SECURITY DEFINER AS $$
    SELECT
        u.user_id,
        pr.display_name,
        COALESCE(pc.cnt, 0)  AS products_count,
        COALESCE(prc.cnt, 0) AS prices_count,
        COALESCE(pc.cnt, 0) * 20
            + COALESCE(prc.cnt, 0) * 5
            + COALESCE(ver.points, 0) AS reputation
    FROM (
        SELECT DISTINCT created_by AS user_id FROM products WHERE created_by IS NOT NULL
        UNION
        SELECT DISTINCT created_by AS user_id FROM prices WHERE created_by IS NOT NULL
    ) u
    LEFT JOIN profiles pr ON u.user_id = pr.id
    LEFT JOIN (SELECT created_by, COUNT(*) AS cnt FROM products GROUP BY created_by) pc ON u.user_id = pc.created_by
    LEFT JOIN (SELECT created_by, COUNT(*) AS cnt FROM prices GROUP BY created_by) prc ON u.user_id = prc.created_by
    LEFT JOIN (
        SELECT p.created_by,
               SUM(CASE WHEN pv.vote = 'confirm' THEN 1 ELSE -1 END) AS points
        FROM price_verifications pv
        JOIN prices p ON pv.price_id = p.id
        GROUP BY p.created_by
    ) ver ON u.user_id = ver.created_by
    ORDER BY reputation DESC
    LIMIT p_limit;
$$ LANGUAGE sql;

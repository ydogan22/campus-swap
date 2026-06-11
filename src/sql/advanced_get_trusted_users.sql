-- advanced_get_trusted_users.sql
-- Users who have received at least 1 review with an average rating >= 4.0.
-- Uses GROUP BY + HAVING with COUNT and AVG aggregate functions.
-- Called via: supabase.rpc('get_trusted_users')
-- Used in: HomeInsights.jsx

CREATE OR REPLACE FUNCTION get_trusted_users()
RETURNS TABLE (user_name character varying, total_reviews bigint, average_rating double precision)
LANGUAGE sql
AS $$
  SELECT u.username,
         COUNT(r.reviewid) AS total_reviews,
         AVG(r.rating)     AS average_rating
  FROM   users  u
  JOIN   review r ON u.userid = r.revieweeid
  GROUP  BY u.userid, u.username
  HAVING COUNT(r.reviewid) >= 1
  AND    AVG(r.rating)     >= 4.0;
$$;

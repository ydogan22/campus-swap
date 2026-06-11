-- advanced_get_top_offerers.sql
-- Top 10 users by number of swap offers they have made.
-- Uses GROUP BY + COUNT + ORDER BY + LIMIT.
-- Called via: supabase.rpc('get_top_offerers')
-- Used in: HomeInsights.jsx

CREATE OR REPLACE FUNCTION get_top_offerers()
RETURNS TABLE (user_name character varying, total_offers_made bigint)
LANGUAGE sql
AS $$
  SELECT u.username, COUNT(s.offerid) AS total_offers_made
  FROM   users     u
  JOIN   swapoffer s ON u.userid = s.offererid
  GROUP  BY u.userid, u.username
  ORDER  BY total_offers_made DESC
  LIMIT  10;
$$;

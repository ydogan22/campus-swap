-- advanced_get_trending_products.sql
-- Products whose view count exceeds the average view count of their category.
-- Uses a correlated subquery with AVG().
-- Called via: supabase.rpc('get_trending_products')
-- Used in: HomeInsights.jsx

CREATE OR REPLACE FUNCTION get_trending_products()
RETURNS TABLE (title character varying, view_count integer, category_name character varying)
LANGUAGE sql
AS $$
  SELECT p.title, p.viewcount, c.categoryname
  FROM   product  p
  JOIN   category c ON p.categoryid = c.categoryid
  WHERE  p.status = 'Available'
  AND    p.viewcount > (
    SELECT AVG(p2.viewcount)
    FROM   product p2
    WHERE  p2.categoryid = p.categoryid
  );
$$;

-- advanced_get_popular_categories.sql
-- Categories ranked by number of available listings.
-- Uses GROUP BY + HAVING + ORDER BY.
-- Called via: supabase.rpc('get_popular_categories')
-- Used in: HomeInsights.jsx

CREATE OR REPLACE FUNCTION get_popular_categories()
RETURNS TABLE (category_name character varying, active_product_count bigint)
LANGUAGE sql
AS $$
  SELECT c.categoryname, COUNT(p.productid) AS active_product_count
  FROM   category c
  JOIN   product  p ON c.categoryid = p.categoryid
  WHERE  p.status = 'Available'
  GROUP  BY c.categoryid, c.categoryname
  HAVING COUNT(p.productid) > 0
  ORDER  BY active_product_count DESC;
$$;

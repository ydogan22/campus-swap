-- advanced_get_products_without_offers.sql
-- Available products that have received no Pending or Completed swap offers.
-- Uses NOT EXISTS (correlated subquery).
-- Called via: supabase.rpc('get_products_without_offers')
-- Used in: HomeInsights.jsx

CREATE OR REPLACE FUNCTION get_products_without_offers()
RETURNS TABLE (product_id integer, title character varying)
LANGUAGE sql
AS $$
  SELECT p.productid, p.title
  FROM   product p
  WHERE  p.status = 'Available'
  AND    NOT EXISTS (
    SELECT 1
    FROM   swapoffer s
    WHERE  s.targetproductid = p.productid
    AND    s.offerstatus IN ('Pending', 'Completed')
  );
$$;

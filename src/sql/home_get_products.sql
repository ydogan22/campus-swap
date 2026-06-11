-- home_get_products.sql
-- Paginated product listing with seller info and thumbnail photo.
-- Supports optional filters: search (ILIKE), category (IN), status (IN).
-- Used in: Home.jsx (initial load + load more)
--
-- Parameters:
--   :search_query  → '%<term>%'  (omit WHERE clause if empty)
--   :category_ids  → array       (omit IN clause if empty)
--   :statuses      → array       (omit IN clause if empty)
--   :limit         → page size   (12)
--   :offset        → page * 12

SELECT  p.productid,
        p.title,
        p.itemcondition,
        p.status,
        p.viewcount,
        p.categoryid,
        u.username      AS seller_username,
        u.overallrating AS seller_rating,
        (
          SELECT photourl
          FROM   productphoto
          WHERE  productid = p.productid
          ORDER  BY photoid ASC
          LIMIT  1
        )               AS thumbnail
FROM    product p
JOIN    users u ON u.userid = p.ownerid
WHERE   p.title ILIKE :search_query         -- omit if no search
AND     p.categoryid = ANY(:category_ids)   -- omit if no category filter
AND     p.status     = ANY(:statuses)       -- omit if no status filter
ORDER   BY p.productid DESC
LIMIT   :limit
OFFSET  :offset;

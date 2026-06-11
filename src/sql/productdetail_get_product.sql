-- productdetail_get_product.sql
-- Fetch a single product's full details including seller, category and all photos.
-- Used in: ProductDetail.jsx

SELECT p.productid,
       p.title,
       p.description,
       p.itemcondition,
       p.status,
       p.viewcount,
       p.categoryid,
       u.userid        AS seller_id,
       u.username      AS seller_username,
       u.overallrating AS seller_rating,
       c.categoryname,
       pp.photoid,
       pp.photourl
FROM   product      p
JOIN   users        u  ON u.userid     = p.ownerid
LEFT   JOIN category    c  ON c.categoryid = p.categoryid
LEFT   JOIN productphoto pp ON pp.productid = p.productid
WHERE  p.productid = :product_id;

-- myproducts_get_products.sql
-- Fetch all listings owned by the logged-in user, including their photos.
-- Used in: MyProducts.jsx

SELECT p.productid,
       p.title,
       p.description,
       p.itemcondition,
       p.status,
       p.viewcount,
       p.categoryid,
       pp.photoid,
       pp.photourl
FROM   product p
LEFT   JOIN productphoto pp ON pp.productid = p.productid
WHERE  p.ownerid = :user_id
ORDER  BY p.productid DESC;

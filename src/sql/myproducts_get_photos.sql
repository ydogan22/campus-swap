-- myproducts_get_photos.sql
-- Fetch photo URLs for a product before deleting it from Storage.
-- Used in: MyProducts.jsx

SELECT photourl
FROM   productphoto
WHERE  productid = :product_id;

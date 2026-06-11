-- myproducts_delete_photos_by_product.sql
-- Delete ALL photo rows for a product before deleting the product itself
-- (prevents foreign key constraint violations).
-- Used in: MyProducts.jsx

DELETE FROM productphoto
WHERE  productid = :product_id;

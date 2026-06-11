-- myproducts_delete_product.sql
-- Delete a product listing by its ID.
-- Used in: MyProducts.jsx

DELETE FROM product
WHERE  productid = :product_id;

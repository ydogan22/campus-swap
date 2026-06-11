-- myproducts_mark_sold.sql
-- Mark a product as Sold, hiding it from active searches.
-- Used in: MyProducts.jsx

UPDATE product
SET    status = 'Sold'
WHERE  productid = :product_id;

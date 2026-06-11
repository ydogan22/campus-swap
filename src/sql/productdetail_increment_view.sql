-- productdetail_increment_view.sql
-- Increment the view count of a product by 1 on each page load.
-- Used in: ProductDetail.jsx

UPDATE product
SET    viewcount = viewcount + 1
WHERE  productid = :product_id;

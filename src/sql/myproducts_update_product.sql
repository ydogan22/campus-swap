-- myproducts_update_product.sql
-- Update an existing product listing's editable fields.
-- Used in: MyProducts.jsx

UPDATE product
SET    title         = :title,
       description   = :description,
       itemcondition = :item_condition,
       categoryid    = :category_id,
       status        = :status
WHERE  productid = :product_id;

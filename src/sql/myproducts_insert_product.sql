-- myproducts_insert_product.sql
-- Create a new product listing.
-- Used in: MyProducts.jsx

INSERT INTO product
    (ownerid, categoryid, title, description, itemcondition, status, viewcount)
VALUES
    (:user_id, :category_id, :title, :description, :item_condition, 'Available', 0)
RETURNING productid;

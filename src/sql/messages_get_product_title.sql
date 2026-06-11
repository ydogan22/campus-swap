-- messages_get_product_title.sql
-- Fetch a product's title and owner to enrich the conversation list.
-- Used in: Messages.jsx

SELECT title,
       ownerid
FROM   product
WHERE  productid = :product_id;

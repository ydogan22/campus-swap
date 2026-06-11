-- myproducts_insert_photo.sql
-- Insert a photo record after uploading the file to Storage.
-- Used in: MyProducts.jsx

INSERT INTO productphoto (productid, photourl)
VALUES (:product_id, :photo_url);

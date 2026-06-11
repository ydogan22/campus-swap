-- myproducts_delete_photos_by_ids.sql
-- Delete specific photo rows by their IDs (used in edit form — remove selected photos).
-- Used in: MyProducts.jsx

DELETE FROM productphoto
WHERE  photoid = ANY(:photo_ids);

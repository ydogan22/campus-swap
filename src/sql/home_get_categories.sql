-- home_get_categories.sql
-- Fetch all product categories for the filter sidebar.
-- Used in: Home.jsx

SELECT categoryid,
       categoryname
FROM   category;

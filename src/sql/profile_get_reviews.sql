-- profile_get_reviews.sql
-- Fetch all reviews received by the logged-in user, ordered newest first.
-- Used in: Profile.jsx

SELECT reviewid,
       reviewerid,
       offerid,
       rating,
       comment,
       reviewdate
FROM   review
WHERE  revieweeid = :user_id
ORDER  BY reviewdate DESC;

-- profile_get_reviewer_usernames.sql
-- Batch-fetch usernames for all reviewers in a single query.
-- Used in: Profile.jsx

SELECT userid,
       username
FROM   users
WHERE  userid = ANY(:reviewer_ids);

-- profile_update_username.sql
-- Update the display username of the logged-in user.
-- Used in: Profile.jsx

UPDATE users
SET    username = :username
WHERE  userid = :user_id;

-- messages_get_user_username.sql
-- Fetch a user's username by UUID to display in the conversation list.
-- Used in: Messages.jsx

SELECT username
FROM   users
WHERE  userid = :user_id;

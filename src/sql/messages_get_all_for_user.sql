-- messages_get_all_for_user.sql
-- Fetch all messages where the current user is sender OR receiver.
-- Used to build the conversation list sidebar (grouped in JS by productid + other party).
-- Used in: Messages.jsx

SELECT messageid,
       senderid,
       receiverid,
       productid,
       content,
       photourl,
       sentat
FROM   message
WHERE  senderid   = :user_id
OR     receiverid = :user_id
ORDER  BY sentat DESC;

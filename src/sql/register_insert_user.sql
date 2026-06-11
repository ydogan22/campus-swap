-- register_insert_user.sql
-- Insert a new public user profile after successful Auth sign-up.
-- Used in: Register.jsx  (Step 2 of 2)

INSERT INTO users (userid, kumail, username, passwordhash, overallrating)
VALUES (:user_id, :kumail, :username, 'supabase-auth', 0)
ON CONFLICT (userid) DO UPDATE
  SET kumail   = EXCLUDED.kumail,
      username = EXCLUDED.username;

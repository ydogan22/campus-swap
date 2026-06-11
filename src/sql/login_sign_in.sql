-- login_sign_in.sql
-- Authenticate a user using their KU email and password.
-- Handled by Supabase Auth (auth.users table) — pgcrypto based.
-- Used in: Login.jsx
--
-- Conceptual equivalent:
SELECT u.userid,
       u.kumail,
       u.username,
       u.overallrating
FROM   auth.users  a
JOIN   public.users u ON u.userid = a.id
WHERE  a.email = :email
AND    a.encrypted_password = crypt(:password, a.encrypted_password);

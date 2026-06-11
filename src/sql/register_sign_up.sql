-- register_sign_up.sql
-- Create a new auth user via Supabase Auth (writes to auth.users).
-- Handled by Supabase Auth internally — pgcrypto based.
-- Used in: Register.jsx  (Step 1 of 2)
--
-- Conceptual equivalent:
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES (:email, crypt(:password, gen_salt('bf')), NULL);

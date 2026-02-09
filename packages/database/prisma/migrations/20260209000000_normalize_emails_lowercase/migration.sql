-- Normalize existing emails to lowercase.
-- This will fail if duplicate case-variant emails exist (requires manual resolution).
UPDATE users SET email = LOWER(email);

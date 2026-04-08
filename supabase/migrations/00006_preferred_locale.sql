ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT DEFAULT 'en'
    CHECK (preferred_locale IN ('en', 'he', 'ar'));

-- User profiles (public display names)
-- Run this in Supabase Studio > SQL Editor

CREATE TABLE IF NOT EXISTS profiles (
    id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name text,
    first_name   text,
    last_name    text,
    gender       text CHECK (gender IN ('male', 'female', 'other')),
    birth_date   date,
    created_at   timestamptz DEFAULT now()
);

-- Add columns if table already exists (safe to run multiple times)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name  text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name   text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender      text CHECK (gender IN ('male', 'female', 'other'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date  date;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
    ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile row when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (new.id, new.raw_user_meta_data->>'full_name')
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Backfill profiles for existing users (run once)
INSERT INTO profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

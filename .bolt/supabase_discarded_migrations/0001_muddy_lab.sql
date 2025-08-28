/*
  # Authentication and Login Tracking Setup

  1. New Tables
    - profiles: Basic user profile information
      - id: User ID from auth.users
      - email: User's email address
      - created_at: Account creation timestamp
    
    - user_logins: Track authentication events
      - id: Unique login ID
      - user_id: Reference to profiles
      - logged_in_at: Login timestamp
      - email: Email used for login

  2. Security
    - Enable RLS on all tables
    - Users can only view their own data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create login tracking table
CREATE TABLE IF NOT EXISTS user_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  logged_in_at timestamptz DEFAULT now(),
  email text NOT NULL
);

ALTER TABLE user_logins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login history"
  ON user_logins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record login
CREATE OR REPLACE FUNCTION record_user_login()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_logins (user_id, email)
  SELECT 
    new.user_id,
    auth.users.email
  FROM auth.users
  WHERE auth.users.id = new.user_id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_sign_in ON auth.sessions;

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_auth_sign_in
  AFTER INSERT ON auth.sessions
  FOR EACH ROW EXECUTE FUNCTION record_user_login();
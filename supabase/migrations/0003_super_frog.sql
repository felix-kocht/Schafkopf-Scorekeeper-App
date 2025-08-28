/*
  # User Authentication Tracking

  1. New Table
    - user_auth_logs
      - user_id: Reference to auth.users
      - created_at: Account creation timestamp
      - login_timestamps: Array of login timestamps
  
  2. Security
    - Enable RLS
    - Users can only view their own data
*/

CREATE TABLE IF NOT EXISTS user_auth_logs (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  login_timestamps timestamptz[] DEFAULT ARRAY[]::timestamptz[]
);

ALTER TABLE user_auth_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own auth logs"
  ON user_auth_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to create initial log entry on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_auth_logs (user_id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to append login timestamp
CREATE OR REPLACE FUNCTION record_login()
RETURNS trigger AS $$
BEGIN
  UPDATE public.user_auth_logs
  SET login_timestamps = array_append(login_timestamps, now())
  WHERE user_id = new.user_id;
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
  FOR EACH ROW EXECUTE FUNCTION record_login();
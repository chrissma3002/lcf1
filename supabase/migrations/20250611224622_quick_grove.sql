/*
  # Trading Application Database Schema

  1. New Tables
    - `trading_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `initial_capital` (decimal)
      - `current_capital` (decimal)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `trades`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references trading_sessions)
      - `margin` (decimal)
      - `roi` (decimal)
      - `entry_side` (text, 'Long' or 'Short')
      - `profit_loss` (decimal)
      - `comments` (text, optional)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own sessions and trades
    - Policies for authenticated users to manage their data
*/

-- Create trading_sessions table
CREATE TABLE IF NOT EXISTS trading_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  initial_capital decimal(15,2) NOT NULL DEFAULT 0,
  current_capital decimal(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES trading_sessions(id) ON DELETE CASCADE,
  margin decimal(15,2) NOT NULL,
  roi decimal(8,2) NOT NULL,
  entry_side text NOT NULL CHECK (entry_side IN ('Long', 'Short')),
  profit_loss decimal(15,2) NOT NULL,
  comments text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE trading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Create policies for trading_sessions
CREATE POLICY "Users can read own sessions"
  ON trading_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON trading_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON trading_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON trading_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for trades
CREATE POLICY "Users can read own trades"
  ON trades
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trading_sessions 
      WHERE trading_sessions.id = trades.session_id 
      AND trading_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own trades"
  ON trades
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trading_sessions 
      WHERE trading_sessions.id = trades.session_id 
      AND trading_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own trades"
  ON trades
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trading_sessions 
      WHERE trading_sessions.id = trades.session_id 
      AND trading_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trading_sessions 
      WHERE trading_sessions.id = trades.session_id 
      AND trading_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own trades"
  ON trades
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trading_sessions 
      WHERE trading_sessions.id = trades.session_id 
      AND trading_sessions.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS trading_sessions_user_id_idx ON trading_sessions(user_id);
CREATE INDEX IF NOT EXISTS trading_sessions_created_at_idx ON trading_sessions(created_at);
CREATE INDEX IF NOT EXISTS trades_session_id_idx ON trades(session_id);
CREATE INDEX IF NOT EXISTS trades_created_at_idx ON trades(created_at);
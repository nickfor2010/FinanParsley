-- This is a sample schema for the Supabase database
-- You can run this in the Supabase SQL Editor to set up your tables

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create financial_data table
CREATE TABLE IF NOT EXISTS financial_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('revenue', 'expense')),
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Create policies for financial_data
CREATE POLICY "Users can view their own financial data" 
  ON financial_data FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial data" 
  ON financial_data FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial data" 
  ON financial_data FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial data" 
  ON financial_data FOR DELETE 
  USING (auth.uid() = user_id);

-- Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function when a new user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sample data (optional)
-- Uncomment and modify this to add sample data for testing

-- INSERT INTO financial_data (user_id, category, amount, date, description, type, status)
-- VALUES 
--   ('YOUR_USER_ID', 'Sales', 5000.00, '2023-04-01', 'Product sales', 'revenue', 'completed'),
--   ('YOUR_USER_ID', 'Consulting', 2500.00, '2023-04-05', 'Consulting services', 'revenue', 'completed'),
--   ('YOUR_USER_ID', 'Rent', 1200.00, '2023-04-01', 'Office rent', 'expense', 'completed'),
--   ('YOUR_USER_ID', 'Salaries', 3500.00, '2023-04-15', 'Employee salaries', 'expense', 'completed'),
--   ('YOUR_USER_ID', 'Software', 99.00, '2023-04-10', 'Software subscription', 'expense', 'completed');


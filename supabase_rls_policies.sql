-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can read their own data
CREATE POLICY "Users can view own data" ON users
FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
FOR UPDATE USING (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "Admins can view all users" ON users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.role = 'ADMIN'
  )
);

-- Admins can update all users (for disabling/enabling)
CREATE POLICY "Admins can update all users" ON users
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.role = 'ADMIN'
  )
);

-- Transactions table policies
-- Users can read their own transactions
CREATE POLICY "Users can view own transactions" ON transactions
FOR SELECT USING (auth.uid() = "userId");

-- Users can insert their own transactions
CREATE POLICY "Users can insert own transactions" ON transactions
FOR INSERT WITH CHECK (auth.uid() = "userId");

-- Users can update their own transactions
CREATE POLICY "Users can update own transactions" ON transactions
FOR UPDATE USING (auth.uid() = "userId");

-- Users can delete their own transactions
CREATE POLICY "Users can delete own transactions" ON transactions
FOR DELETE USING (auth.uid() = "userId");

-- Admins can read all transactions
CREATE POLICY "Admins can view all transactions" ON transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.role = 'ADMIN'
  )
);

-- Permissions table policies (admin only)
CREATE POLICY "Admins can manage permissions" ON permissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.role = 'ADMIN'
  )
);

-- Role permissions table policies (admin only)
CREATE POLICY "Admins can manage role permissions" ON role_permissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.role = 'ADMIN'
  )
);
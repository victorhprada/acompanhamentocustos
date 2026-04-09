CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  department VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operational_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_center_id UUID NOT NULL REFERENCES cost_centers(id),
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'BRL',
  expense_date DATE NOT NULL,
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  invoice_number VARCHAR(100),
  contract_number VARCHAR(100),
  due_date DATE,
  paid_date DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_id UUID NOT NULL REFERENCES operational_costs(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID NOT NULL REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_operational_costs_expense_date ON operational_costs(expense_date);
CREATE INDEX IF NOT EXISTS idx_operational_costs_status ON operational_costs(status);
CREATE INDEX IF NOT EXISTS idx_operational_costs_cost_center ON operational_costs(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_operational_costs_created_by ON operational_costs(created_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs(changed_at);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR(50) AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_role(required_role VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR(50);
BEGIN
  user_role := get_user_role();
  
  CASE required_role
    WHEN 'viewer' THEN
      RETURN user_role IN ('admin', 'analyst', 'viewer');
    WHEN 'analyst' THEN
      RETURN user_role IN ('admin', 'analyst');
    WHEN 'admin' THEN
      RETURN user_role = 'admin';
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT USING (has_role('admin'));

DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE USING (has_role('admin'));

DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT WITH CHECK (has_role('admin'));

-- Cost centers policies
DROP POLICY IF EXISTS "Authenticated users can view cost centers" ON cost_centers;
CREATE POLICY "Authenticated users can view cost centers"
  ON cost_centers FOR SELECT USING (is_active = true OR has_role('admin'));

DROP POLICY IF EXISTS "Admin/Analyst can modify cost centers" ON cost_centers;
CREATE POLICY "Admin/Analyst can modify cost centers"
  ON cost_centers FOR ALL
  USING (has_role('analyst'))
  WITH CHECK (has_role('analyst'));

-- Operational costs policies
DROP POLICY IF EXISTS "All roles can view operational costs" ON operational_costs;
CREATE POLICY "All roles can view operational costs"
  ON operational_costs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin/Analyst can create costs" ON operational_costs;
CREATE POLICY "Admin/Analyst can create costs"
  ON operational_costs FOR INSERT WITH CHECK (has_role('analyst'));

DROP POLICY IF EXISTS "Admin/Analyst can update costs" ON operational_costs;
CREATE POLICY "Admin/Analyst can update costs"
  ON operational_costs FOR UPDATE
  USING (
    has_role('admin') OR 
    (has_role('analyst') AND status IN ('pending', 'approved'))
  );

DROP POLICY IF EXISTS "Admin can delete costs" ON operational_costs;
CREATE POLICY "Admin can delete costs"
  ON operational_costs FOR DELETE USING (has_role('admin'));

-- Cost attachments policies
DROP POLICY IF EXISTS "Users can view attachments" ON cost_attachments;
CREATE POLICY "Users can view attachments"
  ON cost_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM operational_costs oc WHERE oc.id = cost_attachments.cost_id
  ));

DROP POLICY IF EXISTS "Admin/Analyst can upload attachments" ON cost_attachments;
CREATE POLICY "Admin/Analyst can upload attachments"
  ON cost_attachments FOR INSERT WITH CHECK (has_role('analyst'));

DROP POLICY IF EXISTS "Admin can delete attachments" ON cost_attachments;
CREATE POLICY "Admin can delete attachments"
  ON cost_attachments FOR DELETE USING (has_role('admin'));

-- Audit logs policies
DROP POLICY IF EXISTS "Admin can view audit logs" ON audit_logs;
CREATE POLICY "Admin can view audit logs"
  ON audit_logs FOR SELECT USING (has_role('admin'));

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)::jsonb ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers
DROP TRIGGER IF EXISTS audit_profiles ON profiles;
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_cost_centers ON cost_centers;
CREATE TRIGGER audit_cost_centers
  AFTER INSERT OR UPDATE OR DELETE ON cost_centers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_operational_costs ON operational_costs;
CREATE TRIGGER audit_operational_costs
  AFTER INSERT OR UPDATE OR DELETE ON operational_costs
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_cost_attachments ON cost_attachments;
CREATE TRIGGER audit_cost_attachments
  AFTER INSERT OR UPDATE OR DELETE ON cost_attachments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

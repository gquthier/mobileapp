-- Create bug_reports table for automatic error logging
CREATE TABLE IF NOT EXISTS bug_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  -- User info
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_email TEXT,

  -- Error details
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_type TEXT, -- 'crash', 'network', 'ui', 'api', etc.
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'

  -- Context
  screen_name TEXT,
  action TEXT, -- What the user was doing
  component_name TEXT,

  -- Device info
  device_info JSONB DEFAULT '{}'::jsonb, -- OS, version, device model, etc.
  app_version TEXT,

  -- Additional data
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Status
  status TEXT DEFAULT 'new', -- 'new', 'investigating', 'resolved', 'ignored'
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id ON bug_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON bug_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_severity ON bug_reports(severity);
CREATE INDEX IF NOT EXISTS idx_bug_reports_error_type ON bug_reports(error_type);

-- Enable Row Level Security
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own bug reports
CREATE POLICY "Users can insert own bug reports" ON bug_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own bug reports
CREATE POLICY "Users can view own bug reports" ON bug_reports
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can view all bug reports (for admin dashboard)
CREATE POLICY "Service role can view all bug reports" ON bug_reports
  FOR SELECT USING (auth.role() = 'service_role');

-- Policy: Service role can update bug reports (for admin dashboard)
CREATE POLICY "Service role can update bug reports" ON bug_reports
  FOR UPDATE USING (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE bug_reports IS 'Automatic error logging from mobile app for admin monitoring';

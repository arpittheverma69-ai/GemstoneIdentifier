-- Create pending_users table for new signups awaiting admin approval
CREATE TABLE IF NOT EXISTS public.pending_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  requested_role TEXT DEFAULT 'Looker',
  status TEXT CHECK (status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for pending_users
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own pending request
CREATE POLICY "Users can view their own pending request" ON public.pending_users
  FOR SELECT USING (auth.uid() = user_id);

-- Admins and Curators can view all pending requests
CREATE POLICY "Admins and Curators can view all pending requests" ON public.pending_users
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can insert their own pending request
CREATE POLICY "Users can insert their own pending request" ON public.pending_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can update pending requests
CREATE POLICY "Admins can update pending requests" ON public.pending_users
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Trigger to update updated_at for pending_users
CREATE OR REPLACE FUNCTION update_pending_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pending_users_updated_at
  BEFORE UPDATE ON public.pending_users
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_users_timestamp();

-- Create pending_users table
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

-- Enable RLS
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own pending request" ON public.pending_users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all pending requests" ON public.pending_users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own pending request" ON public.pending_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update pending requests" ON public.pending_users
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.pending_users TO authenticated;
GRANT ALL ON public.pending_users TO service_role;

-- Refresh schema
NOTIFY pgrst, 'reload schema';

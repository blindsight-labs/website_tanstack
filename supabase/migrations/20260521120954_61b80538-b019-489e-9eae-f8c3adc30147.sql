
CREATE TABLE public.demo_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  work_email TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT,
  company_size TEXT,
  use_case TEXT,
  message TEXT,
  consent BOOLEAN NOT NULL DEFAULT false,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit; no one can read via anon/auth (only service role)
CREATE POLICY "Anyone can submit a demo request"
  ON public.demo_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

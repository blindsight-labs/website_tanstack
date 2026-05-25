-- Create job_applications table
CREATE TABLE public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT,
  cv_path TEXT,
  consent BOOLEAN NOT NULL DEFAULT false,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- No public access; only service role (server fns) can read/write.
CREATE POLICY "no_public_select_job_applications"
ON public.job_applications FOR SELECT
TO authenticated, anon
USING (false);

-- Private bucket for CVs
INSERT INTO storage.buckets (id, name, public)
VALUES ('cv-uploads', 'cv-uploads', false)
ON CONFLICT (id) DO NOTHING;
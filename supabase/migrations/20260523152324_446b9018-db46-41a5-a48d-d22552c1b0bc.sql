
-- Deny all direct access to demo_requests; writes happen via service role in server function
CREATE POLICY "no_public_select_demo_requests"
  ON public.demo_requests FOR SELECT
  TO anon, authenticated
  USING (false);

CREATE POLICY "no_public_insert_demo_requests"
  ON public.demo_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "no_public_update_demo_requests"
  ON public.demo_requests FOR UPDATE
  TO anon, authenticated
  USING (false);

CREATE POLICY "no_public_delete_demo_requests"
  ON public.demo_requests FOR DELETE
  TO anon, authenticated
  USING (false);

-- Deny all direct access to cv-uploads bucket; uploads/reads happen via service role
CREATE POLICY "no_public_select_cv_uploads"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'cv-uploads' AND false);

CREATE POLICY "no_public_insert_cv_uploads"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'cv-uploads' AND false);

CREATE POLICY "no_public_update_cv_uploads"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'cv-uploads' AND false);

CREATE POLICY "no_public_delete_cv_uploads"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'cv-uploads' AND false);

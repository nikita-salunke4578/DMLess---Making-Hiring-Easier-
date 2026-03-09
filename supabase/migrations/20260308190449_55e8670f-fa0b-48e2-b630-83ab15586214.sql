
-- Fix hiring_links policies: make public SELECT permissive, keep recruiter management permissive
DROP POLICY IF EXISTS "Anyone can view active links by slug" ON public.hiring_links;
DROP POLICY IF EXISTS "Recruiters can manage own links" ON public.hiring_links;

CREATE POLICY "Anyone can view active links by slug"
ON public.hiring_links FOR SELECT
USING (is_active = true);

CREATE POLICY "Recruiters can manage own links"
ON public.hiring_links FOR ALL TO authenticated
USING (auth.uid() = recruiter_id)
WITH CHECK (auth.uid() = recruiter_id);

-- Fix questions policies
DROP POLICY IF EXISTS "Anyone can view questions for active links" ON public.questions;
DROP POLICY IF EXISTS "Recruiters can manage questions for own links" ON public.questions;

CREATE POLICY "Anyone can view questions for active links"
ON public.questions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM hiring_links
  WHERE hiring_links.id = questions.hiring_link_id AND hiring_links.is_active = true
));

CREATE POLICY "Recruiters can manage questions for own links"
ON public.questions FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM hiring_links
  WHERE hiring_links.id = questions.hiring_link_id AND hiring_links.recruiter_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM hiring_links
  WHERE hiring_links.id = questions.hiring_link_id AND hiring_links.recruiter_id = auth.uid()
));

-- Fix candidate_submissions policies
DROP POLICY IF EXISTS "Anyone can insert submissions" ON public.candidate_submissions;
DROP POLICY IF EXISTS "Can update submissions" ON public.candidate_submissions;
DROP POLICY IF EXISTS "Recruiters can view submissions for own links" ON public.candidate_submissions;
DROP POLICY IF EXISTS "Recruiters can delete submissions for own links" ON public.candidate_submissions;

CREATE POLICY "Anyone can insert submissions"
ON public.candidate_submissions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Can update submissions"
ON public.candidate_submissions FOR UPDATE
USING (status IN ('in_progress', 'qualified'))
WITH CHECK (status IN ('in_progress', 'completed', 'knocked_out', 'qualified'));

CREATE POLICY "Recruiters can view submissions for own links"
ON public.candidate_submissions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM hiring_links
  WHERE hiring_links.id = candidate_submissions.hiring_link_id AND hiring_links.recruiter_id = auth.uid()
));

CREATE POLICY "Recruiters can delete submissions for own links"
ON public.candidate_submissions FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM hiring_links
  WHERE hiring_links.id = candidate_submissions.hiring_link_id AND hiring_links.recruiter_id = auth.uid()
));

-- Fix profiles policies
DROP POLICY IF EXISTS "Anyone can view company branding" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Anyone can view company branding"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id);


-- Hiring links table
CREATE TABLE public.hiring_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  slug text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  time_limit_minutes integer NOT NULL DEFAULT 30,
  max_tab_switches integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hiring_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can manage own links" ON public.hiring_links FOR ALL TO authenticated USING (auth.uid() = recruiter_id) WITH CHECK (auth.uid() = recruiter_id);
CREATE POLICY "Anyone can view active links by slug" ON public.hiring_links FOR SELECT TO anon, authenticated USING (is_active = true);

-- Questions table
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hiring_link_id uuid NOT NULL REFERENCES public.hiring_links(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  correct_option integer NOT NULL,
  is_knockout boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can manage questions for own links" ON public.questions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.hiring_links WHERE id = questions.hiring_link_id AND recruiter_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.hiring_links WHERE id = questions.hiring_link_id AND recruiter_id = auth.uid())
);
CREATE POLICY "Anyone can view questions for active links" ON public.questions FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM public.hiring_links WHERE id = questions.hiring_link_id AND is_active = true)
);

-- Candidate submissions table
CREATE TABLE public.candidate_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hiring_link_id uuid NOT NULL REFERENCES public.hiring_links(id) ON DELETE CASCADE,
  candidate_name text NOT NULL,
  candidate_email text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}',
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  knocked_out boolean NOT NULL DEFAULT false,
  knockout_reason text,
  tab_switch_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.candidate_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can view submissions for own links" ON public.candidate_submissions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.hiring_links WHERE id = candidate_submissions.hiring_link_id AND recruiter_id = auth.uid())
);
CREATE POLICY "Anyone can insert submissions" ON public.candidate_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update own submission" ON public.candidate_submissions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Trigger for updated_at on hiring_links
CREATE TRIGGER update_hiring_links_updated_at BEFORE UPDATE ON public.hiring_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

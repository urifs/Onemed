-- ═══════════════════════════════════════════════════════════════════════════
-- Member platform: courses library mirrored from Google Drive, watch progress,
-- and per-course community comments.
-- ═══════════════════════════════════════════════════════════════════════════

-- courses = top-level folders inside the shared Drive library
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_folder_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Outros cursos',
  description TEXT,
  cover_image_url TEXT,
  cover_source TEXT NOT NULL DEFAULT 'generated', -- 'curated' | 'generated'
  lesson_count INTEGER NOT NULL DEFAULT 0,
  material_count INTEGER NOT NULL DEFAULT 0,
  total_duration_seconds INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_courses_category ON public.courses(category);
CREATE INDEX idx_courses_active ON public.courses(active);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- course_modules = subfolders within a course folder
CREATE TABLE public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  drive_folder_id TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, drive_folder_id)
);
CREATE INDEX idx_course_modules_course ON public.course_modules(course_id);
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

-- lessons = files (video/pdf/doc/other) inside a course or module folder
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.course_modules(id) ON DELETE SET NULL,
  drive_file_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other', -- 'video' | 'pdf' | 'doc' | 'audio' | 'other'
  mime_type TEXT,
  duration_seconds INTEGER,
  size_bytes BIGINT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, drive_file_id)
);
CREATE INDEX idx_lessons_course ON public.lessons(course_id);
CREATE INDEX idx_lessons_module ON public.lessons(module_id);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- lesson_progress = per-student watch/read progress
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  last_watched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);
CREATE INDEX idx_lesson_progress_user ON public.lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_course ON public.lesson_progress(user_id, course_id);
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- course_comments = community discussion thread per course (with replies)
-- user_id references public.profiles (not auth.users directly) so PostgREST
-- can embed the commenter's name/email in a single select().
CREATE TABLE public.course_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.course_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_comments_course ON public.course_comments(course_id, created_at);
ALTER TABLE public.course_comments ENABLE ROW LEVEL SECURITY;

-- ─── Access helper ────────────────────────────────────────────────────────
-- A "member" is any authenticated user whose email has an active trial/paid
-- access or a completed purchase. SECURITY DEFINER to read across tables
-- without needing broad RLS grants on accesses/buyers.
CREATE OR REPLACE FUNCTION public.is_member()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.accesses a WHERE a.email = u.email AND a.status = 'active')
      OR EXISTS (SELECT 1 FROM public.buyers b WHERE b.email = u.email AND b.access_granted = true)
    )
  )
$$;

-- ─── RLS: courses / course_modules / lessons (read-only library) ──────────
CREATE POLICY "Members can view active courses" ON public.courses
  FOR SELECT USING (active AND (public.is_member() OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Admins manage courses" ON public.courses
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view modules" ON public.course_modules
  FOR SELECT USING (public.is_member() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage modules" ON public.course_modules
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view lessons" ON public.lessons
  FOR SELECT USING (public.is_member() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage lessons" ON public.lessons
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ─── RLS: lesson_progress (own rows only) ──────────────────────────────────
CREATE POLICY "Users manage own progress" ON public.lesson_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND public.is_member());
CREATE POLICY "Admins view all progress" ON public.lesson_progress
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ─── RLS: course_comments (member community) ───────────────────────────────
CREATE POLICY "Members can view comments" ON public.course_comments
  FOR SELECT USING (public.is_member() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members can post comments" ON public.course_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_member());
CREATE POLICY "Users can update own comments" ON public.course_comments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users and admins can delete comments" ON public.course_comments
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Members can see each other's display name/email so comment authorship
-- renders in the community tab (existing profiles policies only allow
-- viewing one's own row or admin access).
CREATE POLICY "Members can view profiles for community" ON public.profiles
  FOR SELECT USING (public.is_member());

-- ─── updated_at triggers ────────────────────────────────────────────────────
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_course_comments_updated_at BEFORE UPDATE ON public.course_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

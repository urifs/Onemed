-- Reorder existing lesson rows so video media always comes before every
-- other file type within a course, matching the priority member-sync-library
-- now applies on every new sync. Partitioning by course_id (not module_id)
-- still yields video-first ordering within each module once the frontend
-- groups lessons by module_id, since every video in the course gets a lower
-- sort_order than every non-video file in the course.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY course_id
      ORDER BY (type <> 'video'), sort_order
    ) - 1 AS new_sort_order
  FROM public.lessons
)
UPDATE public.lessons l
SET sort_order = r.new_sort_order
FROM ranked r
WHERE l.id = r.id
  AND l.sort_order IS DISTINCT FROM r.new_sort_order;

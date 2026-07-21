-- member-sync-library used to import stray .html exports (e.g. a Google Doc
-- downloaded as "Web Page") as regular lesson rows, showing up as a broken
-- "arquivo" in the member area with nothing playable behind it. The sync
-- function itself now skips text/html on import; this cleans up the ones
-- already synced and recomputes each affected course's cached counters.
DELETE FROM public.lessons WHERE mime_type = 'text/html';

UPDATE public.courses c SET
  lesson_count = COALESCE(sub.lesson_count, 0),
  material_count = COALESCE(sub.material_count, 0)
FROM (
  SELECT co.id AS course_id, l.lesson_count, l.material_count
  FROM public.courses co
  LEFT JOIN (
    SELECT course_id,
           count(*) AS lesson_count,
           count(*) FILTER (WHERE type <> 'video') AS material_count
    FROM public.lessons
    GROUP BY course_id
  ) l ON l.course_id = co.id
) sub
WHERE c.id = sub.course_id;

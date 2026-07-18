import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { CourseCover } from './CourseCover';
import { formatDuration } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Course = Database['public']['Tables']['courses']['Row'];

interface CourseCardProps {
  course: Course;
  progressPercent?: number;
}

export function CourseCard({ course, progressPercent }: CourseCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/membros/curso/${course.slug}`)}
      className="group flex flex-col self-start w-full text-left"
    >
      <div className="relative aspect-video rounded-xl overflow-hidden border border-border transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-[0_18px_40px_-16px_rgba(239,68,68,0.5)]">
        <CourseCover title={course.title} coverImageUrl={course.cover_image_url} coverSource={course.cover_source} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-11 h-11 rounded-full bg-black/55 border border-white/25 backdrop-blur flex items-center justify-center">
            <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
          </div>
        </div>
        {course.lesson_count > 0 && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-black/55 border border-white/15 text-white/90 backdrop-blur">
            {course.lesson_count} aula{course.lesson_count !== 1 ? 's' : ''}
          </span>
        )}
        {typeof progressPercent === 'number' && progressPercent > 0 && (
          <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-black/40">
            <div className="h-full bg-primary" style={{ width: `${Math.min(100, progressPercent)}%` }} />
          </div>
        )}
      </div>
      <p className="mt-2 text-sm font-medium text-foreground leading-snug line-clamp-2">{course.title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {typeof progressPercent === 'number' && progressPercent > 0
          ? `${Math.round(progressPercent)}% concluído`
          : formatDuration(course.total_duration_seconds) || `${course.material_count} materiais`}
      </p>
    </button>
  );
}

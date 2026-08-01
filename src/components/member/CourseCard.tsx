import { useNavigate } from 'react-router-dom';
import { Play, Star } from 'lucide-react';
import { CourseCover } from './CourseCover';
import { formatDuration } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Course = Database['public']['Tables']['courses']['Row'];

interface CourseCardProps {
  course: Course;
  progressPercent?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (courseId: string, currentStatus: boolean) => void;
}

export function CourseCard({ course, progressPercent, isFavorite, onToggleFavorite }: CourseCardProps) {
  const navigate = useNavigate();

  return (
    <div className="group flex flex-col self-start w-full text-left relative">
      <button
        onClick={() => navigate(`/membros/curso/${course.slug}`)}
        className="w-full text-left focus:outline-none relative block aspect-video rounded-xl overflow-hidden border border-border transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-[0_18px_40px_-16px_rgba(239,68,68,0.5)]"
      >
        <CourseCover title={course.title} titleClassName="text-[13px] sm:text-sm" />
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
      </button>
      
      {onToggleFavorite && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite(course.id, isFavorite || false);
          }}
          className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur z-10 transition-colors ${
            isFavorite 
              ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30' 
              : 'bg-black/40 text-white/70 hover:text-white hover:bg-black/60'
          }`}
        >
          <Star className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      )}

      <button
        onClick={() => navigate(`/membros/curso/${course.slug}`)}
        className="w-full text-left focus:outline-none"
      >
        <p className="text-[13px] sm:text-sm font-semibold text-foreground mt-2 leading-snug line-clamp-2">
          {course.title}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {typeof progressPercent === 'number' && progressPercent > 0
            ? `${Math.round(progressPercent)}% concluído`
            : formatDuration(course.total_duration_seconds) || `${course.material_count} materiais`}
        </p>
      </button>
    </div>
  );
}

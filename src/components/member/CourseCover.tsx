import { cn } from '@/lib/utils';

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

interface CourseCoverProps {
  title: string;
  coverImageUrl?: string | null;
  className?: string;
  iconClassName?: string;
}

/** Brand-consistent red-gradient cover, used whenever a course has no researched cover image yet. */
export function CourseCover({ title, coverImageUrl, className, iconClassName }: CourseCoverProps) {
  if (coverImageUrl) {
    return (
      <img
        src={coverImageUrl}
        alt={title}
        loading="lazy"
        className={cn('w-full h-full object-cover', className)}
      />
    );
  }

  const h = hashStr(title);
  const angle = 115 + (h % 50);
  const l1 = 9 + (h % 6);
  const l2 = 21 + ((h >> 3) % 11);
  const hueShift = h % 8;

  return (
    <div
      className={cn('relative w-full h-full flex items-center justify-center overflow-hidden', className)}
      style={{
        background: `linear-gradient(${angle}deg, hsl(0 82% ${l1}%) 0%, hsl(${356 + hueShift} 84% ${l2}%) 55%, hsl(0 0% 6%) 100%)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{ backgroundImage: 'radial-gradient(circle at 85% -10%, rgba(255,255,255,.28), transparent 55%)' }}
      />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(115deg, transparent 0 22px, rgba(255,255,255,.6) 22px 23px)',
        }}
      />
      <span className={cn('relative font-secondary font-extrabold text-white/15 select-none', iconClassName || 'text-6xl')}>
        {title.trim().charAt(0).toUpperCase() || '+'}
      </span>
    </div>
  );
}

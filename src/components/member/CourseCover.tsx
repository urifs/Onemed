import { cn, stripYearFromTitle } from '@/lib/utils';

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

interface CourseCoverProps {
  title: string;
  className?: string;
  /** Hide the in-tile title — used where the title is already shown nearby (e.g. hero banners). */
  showTitle?: boolean;
  titleClassName?: string;
}

/**
 * Brand red-gradient tile with the course name set in bold, impactful type.
 * Colors here are a per-course hashed hsl(), always dark, by design —
 * independent of the platform's light/dark theme (like an album cover).
 */
export function CourseCover({ title, className, showTitle = true, titleClassName }: CourseCoverProps) {
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
      {showTitle && (
        <p
          className={cn(
            'relative font-secondary font-extrabold text-white text-center leading-[1.15] tracking-tight px-4 line-clamp-4 [text-shadow:0_2px_12px_rgba(0,0,0,0.5)]',
            titleClassName || 'text-[15px] sm:text-base',
          )}
        >
          {stripYearFromTitle(title)}
        </p>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAnnouncementSettings() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.from('announcement_settings').select('message, enabled').maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const row = data as { message: string | null; enabled: boolean } | null;
        setMessage(row?.enabled && row.message?.trim() ? row.message : null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { message, loading };
}

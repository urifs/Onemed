import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useCommunitySettings() {
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.from('community_settings').select('whatsapp_group_url').maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setWhatsappGroupUrl((data as { whatsapp_group_url: string | null } | null)?.whatsapp_group_url || null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { whatsappGroupUrl, loading };
}

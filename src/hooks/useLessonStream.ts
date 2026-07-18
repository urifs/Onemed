import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

/** Requests a short-lived signed URL that streams a lesson's file through member-stream-file. */
export function useLessonStreamUrl() {
  return useCallback(async (lessonId: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('member-lesson-token', { body: { lessonId } });
    if (error || !data?.token) {
      throw new Error(data?.error || error?.message || 'Não foi possível carregar esta aula');
    }
    return `${FUNCTIONS_BASE}/member-stream-file?token=${encodeURIComponent(data.token)}`;
  }, []);
}

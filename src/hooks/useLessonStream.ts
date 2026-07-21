import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { extractFunctionErrorMessage } from '@/lib/utils';

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

/** Requests a short-lived signed URL that streams a lesson's file through member-stream-file. */
export function useLessonStreamUrl() {
  return useCallback(async (lessonId: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('member-lesson-token', { body: { lessonId } });
    if (error || !data?.token) {
      const msg = data?.error || await extractFunctionErrorMessage(error, 'Não foi possível carregar esta aula');
      throw new Error(msg);
    }
    return `${FUNCTIONS_BASE}/member-stream-file?token=${encodeURIComponent(data.token)}`;
  }, []);
}

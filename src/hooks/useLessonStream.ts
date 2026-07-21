import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { extractFunctionErrorMessage } from '@/lib/utils';

/** Requests a direct Google Drive download URL for a lesson's file (see member-lesson-token). */
export function useLessonStreamUrl() {
  return useCallback(async (lessonId: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('member-lesson-token', { body: { lessonId } });
    if (error || !data?.url) {
      const msg = data?.error || await extractFunctionErrorMessage(error, 'Não foi possível carregar esta aula');
      throw new Error(msg);
    }
    return data.url;
  }, []);
}

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export type PlaylistItemType =
  | 'course' | 'lesson' | 'flashcard_deck' | 'question_bank' | 'study_plan' | 'archive_item';

export interface Playlist {
  id: string;
  name: string;
  notes: string;
  is_default: boolean;
  item_count: number;
  created_at: string;
}

// Playlists do aluno, em cache compartilhado por react-query — o botão "Salvar
// na playlist" aparece em muitos lugares e todos leem a MESMA lista. A RPC
// my_playlists cria a "Assistir depois" padrão na primeira chamada.
export function usePlaylists() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['playlists', user?.id],
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Playlist[]> => {
      const { data, error } = await supabase.rpc('my_playlists' as never);
      if (error) throw error;
      return (data as unknown as Playlist[]) || [];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['playlists', user?.id] });

  return { playlists: data || [], loading: isLoading, refetch, invalidate };
}

// Em quais playlists este item já está (pra marcar os checks do dropdown).
export async function playlistsOfItem(itemType: PlaylistItemType, itemId: string): Promise<Set<string>> {
  const { data, error } = await supabase.rpc('playlists_of_item' as never, {
    _item_type: itemType, _item_id: itemId,
  } as never);
  if (error) return new Set();
  return new Set(((data as unknown as { playlist_id: string }[]) || []).map(r => r.playlist_id));
}

export async function addToPlaylist(playlistId: string, itemType: PlaylistItemType, itemId: string) {
  const { error } = await supabase.rpc('playlist_add' as never, {
    _playlist_id: playlistId, _item_type: itemType, _item_id: itemId,
  } as never);
  if (error) throw error;
}

export async function removeFromPlaylist(playlistId: string, itemType: PlaylistItemType, itemId: string) {
  const { error } = await supabase.rpc('playlist_remove' as never, {
    _playlist_id: playlistId, _item_type: itemType, _item_id: itemId,
  } as never);
  if (error) throw error;
}

export async function createPlaylist(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('playlist_create' as never, { _name: name } as never);
  if (error) throw error;
  return data as unknown as string;
}

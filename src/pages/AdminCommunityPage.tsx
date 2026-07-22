import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDateTimeSP, fetchAllRows } from '@/lib/utils';
import { AlertTriangle, RefreshCw, Search, Trash2, MessageCircle, MessagesSquare } from 'lucide-react';

interface CommentRow {
  id: string;
  body: string;
  title: string | null;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  course_id: string | null;
  lesson_id: string | null;
  profiles: { name: string | null; email: string | null } | null;
  courses: { title: string | null } | null;
  lessons: { title: string | null } | null;
}

export default function AdminCommunityPage() {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [filtered, setFiltered] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CommentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await fetchAllRows<CommentRow>((f, t) =>
        supabase
          .from('course_comments')
          .select('id, body, title, created_at, user_id, parent_id, course_id, lesson_id, profiles(name, email), courses(title), lessons(title)')
          .order('created_at', { ascending: false })
          .range(f, t) as any,
      );
      setComments(data);
    } catch {
      toast.error('Erro ao carregar comentários');
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let result = comments;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.body.toLowerCase().includes(q) ||
        (c.title || '').toLowerCase().includes(q) ||
        (c.profiles?.name || '').toLowerCase().includes(q) ||
        (c.profiles?.email || '').toLowerCase().includes(q) ||
        (c.courses?.title || '').toLowerCase().includes(q) ||
        (c.lessons?.title || '').toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [comments, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('course_comments').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Comentário excluído');
      setComments(prev => prev.filter(c => c.id !== deleteTarget.id && c.parent_id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err?.message || 'desconhecido'));
    } finally {
      setDeleting(false);
    }
  };

  const typeLabel = (c: CommentRow) => {
    if (c.parent_id) return 'Resposta';
    if (c.lessons?.title) return 'Aula';
    if (c.courses?.title) return 'Curso';
    return 'Tópico';
  };

  const contextLabel = (c: CommentRow) => c.lessons?.title || c.courses?.title || (c.title ? c.title : '—');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-secondary text-3xl font-bold text-foreground flex items-center gap-2">
              <MessagesSquare className="w-7 h-7 text-primary" /> Comunidade
            </h1>
            <p className="text-muted-foreground mt-1">Gerenciar comentários, respostas e tópicos de todos os cursos</p>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchData} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: comments.length },
            { label: 'Tópicos', value: comments.filter(c => !c.parent_id && !c.course_id).length },
            { label: 'Comentários (curso/aula)', value: comments.filter(c => !c.parent_id && c.course_id).length },
            { label: 'Respostas', value: comments.filter(c => c.parent_id).length },
          ].map((s, i) => (
            <Card key={i} className="bg-background-paper border-border">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
                <p className="font-secondary text-2xl font-bold text-foreground">{loading ? '—' : s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por autor, curso, aula ou texto..." className="pl-9 bg-background-paper border-border text-foreground" />
        </div>

        <Card className="bg-background-paper border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Autor', 'Tipo', 'Contexto', 'Conteúdo', 'Data', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-mono uppercase text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                        {c.profiles?.name || c.profiles?.email?.split('@')[0] || 'Aluno'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-foreground">
                          {typeLabel(c)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{contextLabel(c)}</td>
                      <td className="px-4 py-3 text-sm text-foreground max-w-[320px]">
                        <p className="truncate">{c.title ? <span className="font-semibold">{c.title}: </span> : null}{c.body}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatDateTimeSP(c.created_at)}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {loadError && !loading && (
                <div className="flex flex-col items-center gap-3 py-12 text-center px-4">
                  <AlertTriangle className="w-6 h-6 text-accent-warning" />
                  <p className="text-foreground text-sm font-medium">Não foi possível carregar os comentários</p>
                  <Button onClick={fetchData} size="sm" variant="outline" className="border-border text-muted-foreground hover:text-foreground gap-2">
                    <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                  </Button>
                </div>
              )}
              {!loadError && !loading && filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p>Nenhum comentário encontrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-background-paper border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir comentário?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Isso também exclui todas as respostas desse comentário. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  MessageSquare, Users, CheckCircle2, XCircle,
  Loader2, Send, Eye, AlertTriangle, Info, Clock, StopCircle, Trash2,
} from 'lucide-react';

const BATCH_SIZE = 12;

type Audience =
  | 'trial_expired_today'
  | 'trial_expired_yesterday'
  | 'trial_expired_3d'
  | 'trial_expired_5d'
  | 'trial_expired_7d'
  | 'trial_expired_all'
  | 'trial_active'
  | 'buyers_approved'
  | 'buyers_all'
  | 'all_with_whatsapp'
  | 'custom';

interface AudienceGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  options: { value: Audience; label: string; description: string }[];
}

const AUDIENCE_GROUPS: AudienceGroup[] = [
  {
    label: 'Trials expirados',
    icon: Clock,
    options: [
      { value: 'trial_expired_today',     label: 'Hoje',               description: 'Expiraram hoje' },
      { value: 'trial_expired_yesterday', label: 'Ontem',              description: 'Expiraram ontem' },
      { value: 'trial_expired_3d',        label: 'Últimos 3 dias',     description: 'Expiraram nos últimos 3 dias' },
      { value: 'trial_expired_5d',        label: 'Últimos 5 dias',     description: 'Expiraram nos últimos 5 dias' },
      { value: 'trial_expired_7d',        label: 'Últimos 7 dias',     description: 'Expiraram nos últimos 7 dias' },
      { value: 'trial_expired_all',       label: 'Todos os expirados', description: 'Todos os trials já expirados' },
    ],
  },
  {
    label: 'Outros',
    icon: Users,
    options: [
      { value: 'trial_active',      label: 'Trials ativos',         description: 'Usuários com trial em andamento' },
      { value: 'buyers_approved',   label: 'Compradores aprovados', description: 'Quem já pagou e teve acesso liberado' },
      { value: 'buyers_all',        label: 'Todos compradores',     description: 'Todos os registros na tabela de compradores' },
      { value: 'all_with_whatsapp', label: 'Todos com WhatsApp',    description: 'Trials + compradores com número cadastrado' },
      { value: 'custom',            label: 'Lista avulsa',          description: 'Cole uma lista de números manualmente' },
    ],
  },
];

const QUICK_MESSAGES = [
  {
    label: 'Follow-up 1 dia',
    text: `Olá! 👋 Aqui é o OneMed.

Vimos que você testou nosso acervo ontem. Esperamos que tenha gostado! 🎓

Temos uma oferta especial para você garantir acesso completo:

🔥 *10% de desconto* usando o cupom:
*ONEMED10*

👉 onemedcursos.com.br/checkout

Só por tempo limitado!`,
  },
  {
    label: 'Follow-up 7 dias',
    text: `Oi! Sou do OneMed 👨‍⚕️

Faz uma semana que você conheceu nosso acervo médico. Sentimos sua falta!

Preparamos um cupom exclusivo para você:

💊 *20% de desconto* com o código:
*ONEMED20*

+530 cursos • +9.000 livros • Residência e Revalida

👉 onemedcursos.com.br/checkout`,
  },
  {
    label: 'Promoção geral',
    text: `Olá! Aqui é o OneMed 🏥

Temos uma promoção exclusiva ativa agora!

✅ +530 cursos médicos
✅ +9.000 livros atualizados
✅ Material para Residência e Revalida

🎁 Use o cupom *ONEMED10* e garanta *10% de desconto*

👉 onemedcursos.com.br/checkout

Não perca! ⏰`,
  },
];

interface ProgressItem {
  phone: string;
  email?: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
}

export default function WhatsAppPage() {
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<Audience>('trial_expired_today');
  const [customNumbers, setCustomNumbers] = useState('');
  const [delayMs, setDelayMs] = useState(1500);

  const [recipients, setRecipients] = useState<{ phone: string; email?: string }[]>([]);
  const [previewing, setPreviewing] = useState(false);

  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [done, setDone] = useState(false);
  const stopRef = useRef(false);

  // ── Chamada direta à edge function (mostra erro real) ─────────────────────
  async function callFn(body: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Sessão expirada — faça login novamente');
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
      }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error || json?.message || `Erro HTTP ${res.status}`);
    }
    return json;
  }

  // ── Preview ────────────────────────────────────────────────────────────────
  async function handlePreview() {
    setPreviewing(true);
    setRecipients([]);
    try {
      const payload: Record<string, unknown> = { mode: 'list', audience };
      if (audience === 'custom') {
        payload.custom_numbers = customNumbers.split('\n').map(s => s.trim()).filter(Boolean);
      }
      const data = await callFn(payload);
      const list: { phone: string; email?: string }[] = data?.recipients ?? [];
      setRecipients(list);
      toast.success(`${list.length} destinatário${list.length !== 1 ? 's' : ''} encontrado${list.length !== 1 ? 's' : ''}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao buscar destinatários');
    } finally {
      setPreviewing(false);
    }
  }

  // ── Enviar em lotes ────────────────────────────────────────────────────────
  async function handleSend() {
    if (!message.trim()) { toast.error('Digite a mensagem antes de enviar'); return; }
    if (audience === 'custom' && !customNumbers.trim()) { toast.error('Adicione pelo menos um número'); return; }

    setSending(true);
    setDone(false);
    setSentCount(0);
    setFailedCount(0);
    stopRef.current = false;

    try {
      // 1. Buscar lista de destinatários
      const payload: Record<string, unknown> = { mode: 'list', audience };
      if (audience === 'custom') {
        payload.custom_numbers = customNumbers.split('\n').map(s => s.trim()).filter(Boolean);
      }
      const listData = await callFn(payload);
      const allRecipients: { phone: string; email?: string }[] = listData?.recipients ?? [];
      if (allRecipients.length === 0) {
        toast.info('Nenhum destinatário encontrado para este público');
        setSending(false);
        return;
      }

      // 2. Inicializar painel de progresso
      const initial: ProgressItem[] = allRecipients.map(r => ({ phone: r.phone, email: r.email, status: 'pending' }));
      setProgress(initial);
      setRecipients(allRecipients);

      let totalSent = 0;
      let totalFailed = 0;

      // 3. Enviar em lotes
      for (let i = 0; i < allRecipients.length; i += BATCH_SIZE) {
        if (stopRef.current) break;

        const batch = allRecipients.slice(i, i + BATCH_SIZE);
        let batchData: any = null;
        try {
          batchData = await callFn({
            mode: 'batch',
            audience,
            message: message.trim(),
            delay_ms: delayMs,
            batch_recipients: batch,
          });
        } catch (batchErr) {
          console.error('Batch error:', batchErr);
        }

        if (!batchData) {
          // marcar todo o lote como falha
          setProgress(prev => {
            const next = [...prev];
            for (let j = i; j < i + batch.length; j++) {
              if (next[j]) next[j] = { ...next[j], status: 'failed', error: 'Erro no lote' };
            }
            return next;
          });
          totalFailed += batch.length;
          setFailedCount(totalFailed);
        } else {
          const results: { phone: string; status: string; error?: string }[] = batchData.results ?? [];
          const resultMap = new Map(results.map(r => [r.phone, r]));

          setProgress(prev => {
            const next = [...prev];
            for (let j = i; j < i + batch.length; j++) {
              if (!next[j]) continue;
              const r = resultMap.get(next[j].phone);
              if (r) {
                next[j] = { ...next[j], status: r.status === 'sent' ? 'sent' : 'failed', error: r.error };
              } else {
                next[j] = { ...next[j], status: 'failed', error: 'Sem resposta' };
              }
            }
            return next;
          });

          const batchSent = results.filter(r => r.status === 'sent').length;
          const batchFailed = results.filter(r => r.status !== 'sent').length;
          totalSent += batchSent;
          totalFailed += batchFailed;
          setSentCount(totalSent);
          setFailedCount(totalFailed);
        }
      }

      setDone(true);
      toast.success(`Disparo concluído: ${totalSent} enviadas, ${totalFailed} falhas`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setSending(false);
    }
  }

  function handleStop() {
    stopRef.current = true;
    toast.info('Parando após o lote atual...');
  }

  async function handleClearHistory() {
    const { error } = await supabase.from('whatsapp_sends').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) { toast.error('Erro ao limpar histórico: ' + error.message); return; }
    resetState();
    toast.success('Histórico de envios limpo — todos os contatos poderão receber novamente');
  }

  function resetState() {
    setProgress([]);
    setRecipients([]);
    setSentCount(0);
    setFailedCount(0);
    setDone(false);
  }

  const totalProgress = progress.length;
  const doneCount = progress.filter(p => p.status !== 'pending').length;
  const progressPct = totalProgress > 0 ? Math.round((doneCount / totalProgress) * 100) : 0;

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-green-500" />
            Disparos SMS
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Envie SMS em massa via Twilio · Remetente: <span className="text-foreground font-mono">+1 (978) 754-6713</span>
          </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={sending}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 flex-shrink-0">
                <Trash2 className="w-4 h-4 mr-2" /> Limpar histórico
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-background-paper border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">Limpar histórico de envios?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Todos os registros de mensagens enviadas serão removidos. Os contatos voltarão a aparecer nas próximas listas de disparo e os indicadores verde/vermelho serão resetados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-secondary border-border text-foreground">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearHistory} className="bg-red-600 hover:bg-red-700 text-white">
                  Limpar tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Aviso */}
        <div className="flex gap-3 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            <span className="text-yellow-400 font-medium">Boas práticas: </span>
            Envie entre <strong className="text-foreground">8h–20h</strong> · Máximo <strong className="text-foreground">300–500/dia</strong> · Evite repetir a mesma mensagem para o mesmo público em dias seguidos.
          </p>
        </div>

        {/* Seção 1 — Mensagem */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-foreground">1. Mensagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Mensagens prontas</Label>
              <div className="flex flex-wrap gap-2">
                {QUICK_MESSAGES.map(qm => (
                  <button key={qm.label} onClick={() => { setMessage(qm.text); resetState(); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    {qm.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-sm text-muted-foreground">Texto da mensagem <span className="text-red-400">*</span></Label>
                <span className={`text-xs ${message.length > 1000 ? 'text-yellow-400' : 'text-muted-foreground'}`}>{message.length} caracteres</span>
              </div>
              <Textarea
                value={message}
                onChange={e => { setMessage(e.target.value); resetState(); }}
                placeholder={`Digite sua mensagem aqui...\n\nUse *asteriscos* para negrito, _sublinhado_ para itálico e emojis à vontade 🎓`}
                rows={10}
                className="bg-background border-border text-sm resize-none font-mono"
              />
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Info className="w-3 h-3" /> Formatação:</span>
                {[{ s: '*texto*', r: 'negrito' }, { s: '_texto_', r: 'itálico' }, { s: '~texto~', r: 'tachado' }].map(t => (
                  <span key={t.s} className="text-xs text-muted-foreground">
                    <span className="font-mono text-foreground">{t.s}</span> → {t.r}
                  </span>
                ))}
              </div>
            </div>

            {/* Preview visual */}
            {message.trim() && (
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">Preview</Label>
                <div className="bg-[#e5ddd5] rounded-lg p-4">
                  <div className="bg-white rounded-lg px-3 py-2 max-w-xs shadow-sm">
                    <p className="text-[13px] text-gray-800 whitespace-pre-wrap break-words leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: message
                          .replace(/&/g, '&amp;').replace(/</g, '&lt;')
                          .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
                          .replace(/_(.*?)_/g, '<em>$1</em>')
                          .replace(/~(.*?)~/g, '<del>$1</del>')
                          .replace(/\n/g, '<br/>'),
                      }}
                    />
                    <p className="text-[10px] text-gray-400 text-right mt-1">00:00 ✓✓</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção 2 — Público-alvo */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-foreground">2. Público-alvo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {AUDIENCE_GROUPS.map(group => {
              const Icon = group.icon;
              return (
                <div key={group.label}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{group.label}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {group.options.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setAudience(opt.value); resetState(); }}
                        className={`flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-colors ${
                          audience === opt.value
                            ? 'bg-green-500/15 border-green-500/40'
                            : 'border-border hover:bg-secondary'
                        }`}
                      >
                        <span className={`text-sm font-medium ${audience === opt.value ? 'text-green-400' : 'text-foreground'}`}>
                          {opt.label}
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5 leading-tight">{opt.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Lista avulsa */}
            {audience === 'custom' && (
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">Números (um por linha)</Label>
                <Textarea
                  value={customNumbers}
                  onChange={e => { setCustomNumbers(e.target.value); resetState(); }}
                  placeholder={`5563999849659\n5511987654321\n+55 41 98765-4321`}
                  rows={5}
                  className="bg-background border-border font-mono text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">Aceita qualquer formato: com/sem +55, traços ou espaços.</p>
              </div>
            )}

            {/* Botão preview */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="outline" size="sm" onClick={handlePreview}
                disabled={previewing || sending || (audience === 'custom' && !customNumbers.trim())}
                className="border-border text-muted-foreground hover:text-foreground">
                {previewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                Ver quantos serão impactados
              </Button>
              {recipients.length > 0 && !sending && !done && (
                <span className="text-sm text-green-400 font-medium">
                  {recipients.length} destinatário{recipients.length !== 1 ? 's' : ''} com WhatsApp cadastrado
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Seção 3 — Configurações e envio */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-foreground">3. Configurações e Envio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Intervalo entre mensagens</Label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: '1s (rápido)', value: 1000 },
                  { label: '1,5s (recomendado)', value: 1500 },
                  { label: '2s (seguro)', value: 2000 },
                  { label: '3s (muito seguro)', value: 3000 },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setDelayMs(opt.value)}
                    disabled={sending}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      delayMs === opt.value
                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
              <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Não feche esta página durante o envio. O resultado de cada SMS é registrado automaticamente
                e aparece como indicador verde/vermelho na página de <strong className="text-foreground">Usuários Trial</strong>.
                SMS não suporta formatação (*negrito*, _itálico_) — use texto simples.
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button onClick={handleSend} disabled={sending || !message.trim()}
                className="bg-green-600 hover:bg-green-700 text-white" size="lg">
                {sending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando... não feche a página</>
                  : <><Send className="w-4 h-4 mr-2" />Disparar mensagens</>}
              </Button>
              {sending && (
                <Button onClick={handleStop} variant="outline" size="lg"
                  className="border-red-500/40 text-red-400 hover:bg-red-500/10">
                  <StopCircle className="w-4 h-4 mr-2" /> Parar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Painel de progresso em tempo real */}
        {progress.length > 0 && (
          <Card className="bg-background-paper border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-foreground">Progresso do disparo</CardTitle>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> {sentCount} enviadas
                  </span>
                  <span className="text-red-400 font-medium flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> {failedCount} falhas
                  </span>
                  <span className="text-muted-foreground">
                    {doneCount}/{totalProgress}
                  </span>
                </div>
              </div>
              {/* Barra de progresso */}
              <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {done && (
                <p className="text-xs text-green-400 mt-1 font-medium">
                  ✓ Disparo concluído — {sentCount} enviadas, {failedCount} falhas
                </p>
              )}
              {sending && !done && (
                <p className="text-xs text-muted-foreground mt-1">
                  Enviando em lotes de {BATCH_SIZE}... {progressPct}% concluído
                </p>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background-paper border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-mono uppercase text-muted-foreground">Telefone</th>
                      <th className="text-left px-4 py-2 text-xs font-mono uppercase text-muted-foreground">Email</th>
                      <th className="text-left px-4 py-2 text-xs font-mono uppercase text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progress.map((item, idx) => (
                      <tr key={idx} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-2 font-mono text-xs text-foreground">{item.phone}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{item.email || '—'}</td>
                        <td className="px-4 py-2">
                          {item.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                              <Loader2 className="w-3 h-3 animate-spin" /> Aguardando
                            </span>
                          )}
                          {item.status === 'sent' && (
                            <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Enviado
                            </span>
                          )}
                          {item.status === 'failed' && (
                            <span className="inline-flex items-center gap-1 text-red-400 text-xs font-medium" title={item.error}>
                              <XCircle className="w-3.5 h-3.5" /> Falhou
                              {item.error && <span className="text-red-300/70 font-normal truncate max-w-[120px]"> · {item.error}</span>}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </AdminLayout>
  );
}

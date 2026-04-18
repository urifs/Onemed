import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  Smartphone, Users, CheckCircle2, XCircle, Loader2, Send,
  AlertTriangle, Info, Clock, StopCircle, Trash2, Eye,
} from 'lucide-react';

const BATCH_SIZE = 10;

type Audience =
  | 'trial_expired_today' | 'trial_expired_yesterday' | 'trial_expired_3d'
  | 'trial_expired_5d' | 'trial_expired_7d' | 'trial_expired_all'
  | 'trial_active' | 'buyers_approved' | 'buyers_all' | 'all_with_whatsapp' | 'custom';

interface ProgressItem {
  phone: string;
  email?: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
}

const AUDIENCE_GROUPS = [
  {
    label: 'Trials expirados', icon: Clock,
    options: [
      { value: 'trial_expired_today'     as Audience, label: 'Hoje',               description: 'Expiraram hoje' },
      { value: 'trial_expired_yesterday' as Audience, label: 'Ontem',              description: 'Expiraram ontem' },
      { value: 'trial_expired_3d'        as Audience, label: 'Últimos 3 dias',     description: 'Expiraram nos últimos 3 dias' },
      { value: 'trial_expired_5d'        as Audience, label: 'Últimos 5 dias',     description: 'Expiraram nos últimos 5 dias' },
      { value: 'trial_expired_7d'        as Audience, label: 'Últimos 7 dias',     description: 'Expiraram nos últimos 7 dias' },
      { value: 'trial_expired_all'       as Audience, label: 'Todos os expirados', description: 'Todos os trials já expirados' },
    ],
  },
  {
    label: 'Outros', icon: Users,
    options: [
      { value: 'trial_active'      as Audience, label: 'Trials ativos',         description: 'Usuários com trial em andamento' },
      { value: 'buyers_approved'   as Audience, label: 'Compradores aprovados', description: 'Quem já pagou e teve acesso liberado' },
      { value: 'buyers_all'        as Audience, label: 'Todos compradores',     description: 'Todos os registros de compradores' },
      { value: 'all_with_whatsapp' as Audience, label: 'Todos com número',      description: 'Trials + compradores com número cadastrado' },
      { value: 'custom'            as Audience, label: 'Lista avulsa',          description: 'Cole uma lista de números manualmente' },
    ],
  },
];

export default function SMSPage() {
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<Audience>('trial_expired_today');
  const [customNumbers, setCustomNumbers] = useState('');
  const [recipients, setRecipients] = useState<{ phone: string; email?: string }[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [delayMs, setDelayMs] = useState(1000);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [done, setDone] = useState(false);
  const stopRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) toast.error('Sessão não encontrada. Faça login novamente.');
    });
  }, []);

  async function callFn(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('send-sms', { body });
    if (error) throw new Error(error.message || 'Erro na função');
    if (data?.error) throw new Error(data.error);
    return data;
  }

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

  async function handleSend() {
    if (!message.trim()) { toast.error('Digite a mensagem antes de enviar'); return; }
    if (audience === 'custom' && !customNumbers.trim()) { toast.error('Adicione pelo menos um número'); return; }

    setSending(true);
    setDone(false);
    setSentCount(0);
    setFailedCount(0);
    stopRef.current = false;

    try {
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

      setProgress(allRecipients.map(r => ({ phone: r.phone, email: r.email, status: 'pending' })));
      setRecipients(allRecipients);

      let totalSent = 0, totalFailed = 0;

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
        } catch { /* mark as failed below */ }

        if (!batchData) {
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
              next[j] = { ...next[j], status: r?.status === 'sent' ? 'sent' : 'failed', error: r?.error };
            }
            return next;
          });
          const batchSent = results.filter(r => r.status === 'sent').length;
          totalSent += batchSent;
          totalFailed += results.length - batchSent;
          setSentCount(totalSent);
          setFailedCount(totalFailed);
        }
      }

      setDone(true);
      toast.success(`Disparo concluído: ${totalSent} enviados, ${totalFailed} falhas`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setSending(false);
    }
  }

  function handleStop() { stopRef.current = true; toast.info('Parando após o lote atual...'); }

  async function handleClearHistory() {
    const { error } = await supabase.from('sms_sends').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) { toast.error('Erro ao limpar histórico: ' + error.message); return; }
    resetSendState();
    toast.success('Histórico limpo — todos os contatos voltarão a aparecer');
  }

  function resetSendState() {
    setProgress([]); setRecipients([]); setSentCount(0); setFailedCount(0); setDone(false);
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
              <Smartphone className="w-6 h-6 text-blue-500" />
              Disparos SMS
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Via Twilio · Remetente: <span className="font-mono text-foreground">+1 978 754 6613</span>
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
                  Todos os registros serão removidos. Os contatos voltarão a aparecer nas próximas listas.
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

        {/* Aviso Trial Twilio */}
        <div className="flex gap-3 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <span className="text-yellow-400 font-medium">Atenção: </span>
              Contas Twilio trial só enviam para números verificados e adicionam prefixo "Sent from a Twilio trial account".
            </p>
            <p>
              Para enviar para qualquer número sem prefixo, faça o <strong className="text-foreground">upgrade da conta</strong> em Twilio Console → Billing → Upgrade.
            </p>
          </div>
        </div>

        {/* Mensagem */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">1. Mensagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                SMS tem limite de <strong className="text-foreground">160 caracteres</strong> por mensagem.
                Acima disso será cobrado como mensagem extra. Sem formatação (negrito/itálico não funciona em SMS).
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-sm text-muted-foreground">Texto da mensagem <span className="text-red-400">*</span></Label>
                <span className={`text-xs font-medium ${message.length > 160 ? 'text-yellow-400' : message.length > 140 ? 'text-yellow-500/70' : 'text-muted-foreground'}`}>
                  {message.length}/160 {message.length > 160 && `(+${Math.ceil((message.length - 160) / 153)} msg extra)`}
                </span>
              </div>
              <Textarea
                value={message}
                onChange={e => { setMessage(e.target.value); resetSendState(); }}
                placeholder="OneMed: Seu trial expirou! Acesse onemedcursos.com.br e garanta seu acesso completo com 20% OFF usando o cupom ONEMED20."
                rows={5}
                className="bg-background border-border text-sm resize-none"
              />
            </div>

            {message.trim() && (
              <div className="p-3 rounded-lg border border-border bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">Preview SMS:</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{message}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Público-alvo */}
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
                      <button key={opt.value} onClick={() => { setAudience(opt.value); resetSendState(); }}
                        className={`flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-colors ${
                          audience === opt.value
                            ? 'bg-blue-500/15 border-blue-500/40'
                            : 'border-border hover:bg-secondary'
                        }`}>
                        <span className={`text-sm font-medium ${audience === opt.value ? 'text-blue-400' : 'text-foreground'}`}>
                          {opt.label}
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5 leading-tight">{opt.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {audience === 'custom' && (
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">Números (um por linha)</Label>
                <Textarea
                  value={customNumbers}
                  onChange={e => { setCustomNumbers(e.target.value); resetSendState(); }}
                  placeholder={`5563999849659\n5511987654321\n+55 41 98765-4321`}
                  rows={5}
                  className="bg-background border-border font-mono text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">Aceita qualquer formato: com/sem +55, traços ou espaços.</p>
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="outline" size="sm" onClick={handlePreview}
                disabled={previewing || sending || (audience === 'custom' && !customNumbers.trim())}
                className="border-border text-muted-foreground hover:text-foreground">
                {previewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                Ver quantos serão impactados
              </Button>
              {recipients.length > 0 && !sending && !done && (
                <span className="text-sm text-blue-400 font-medium">
                  {recipients.length} destinatário{recipients.length !== 1 ? 's' : ''} encontrado{recipients.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configurações e Envio */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-foreground">3. Configurações e Envio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Intervalo entre mensagens</Label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: '0,5s (rápido)', value: 500 },
                  { label: '1s (recomendado)', value: 1000 },
                  { label: '2s (seguro)', value: 2000 },
                  { label: '3s (muito seguro)', value: 3000 },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setDelayMs(opt.value)} disabled={sending}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      delayMs === opt.value
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
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
                Não feche esta página durante o envio. Cada SMS enviado é cobrado pelo Twilio (~US$0,05 por mensagem para Brasil).
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button onClick={handleSend} disabled={sending || !message.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white" size="lg">
                {sending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando... não feche a página</>
                  : <><Send className="w-4 h-4 mr-2" />Disparar SMS</>}
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

        {/* Progresso */}
        {progress.length > 0 && (
          <Card className="bg-background-paper border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-foreground">Progresso do disparo</CardTitle>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> {sentCount} enviados
                  </span>
                  <span className="text-red-400 font-medium flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> {failedCount} falhas
                  </span>
                  <span className="text-muted-foreground">{doneCount}/{totalProgress}</span>
                </div>
              </div>
              <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-300 rounded-full" style={{ width: `${progressPct}%` }} />
              </div>
              {done && <p className="text-xs text-green-400 mt-1 font-medium">✓ Disparo concluído — {sentCount} enviados, {failedCount} falhas</p>}
              {sending && !done && <p className="text-xs text-muted-foreground mt-1">Enviando em lotes de {BATCH_SIZE}... {progressPct}% concluído</p>}
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
                              {item.error && <span className="text-red-300/70 font-normal truncate max-w-[150px]"> · {item.error}</span>}
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

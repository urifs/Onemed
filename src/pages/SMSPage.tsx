import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Smartphone, Users, CheckCircle2, XCircle, Loader2, Send,
  AlertTriangle, Info, Clock, StopCircle, Trash2, Eye, RefreshCw,
} from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';

const GSM7_BASIC = new Set(
  '@£$¥èéùìòÇ\nØø\rÅå\u0394_\u03A6\u0393\u039B\u03A9\u03A0\u03A8\u03A3\u0398\u039EÆæßÉ' +
  ' !"#¤%&\'()*+,-./:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
)
const GSM7_EXTENDED = new Set('\f^{}\\[~]|€')

function isGSM7(text: string): boolean {
  for (const char of text) {
    if (!GSM7_BASIC.has(char) && !GSM7_EXTENDED.has(char)) return false
  }
  return true
}

function countGSM7(text: string): number {
  let n = 0
  for (const char of text) n += GSM7_EXTENDED.has(char) ? 2 : 1
  return n
}

type Audience =
  | 'trial_expired_today' | 'trial_expired_yesterday' | 'trial_expired_3d'
  | 'trial_expired_5d' | 'trial_expired_7d' | 'trial_expired_all'
  | 'trial_active' | 'buyers_approved' | 'buyers_all' | 'all_with_whatsapp' | 'custom';

interface SmsJob {
  id: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  audience: string;
  message: string;
  delay_ms: number;
  total: number;
  sent: number;
  failed: number;
  processed_index: number;
  created_at: string;
  completed_at?: string;
}

interface SmsJobSend {
  id: string;
  phone: string;
  email?: string;
  status: 'sent' | 'failed';
  error_message?: string;
  created_at: string;
  job_id: string;
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
  const [delayMs, setDelayMs] = useState(1000);

  const [activeJob, setActiveJob] = useState<SmsJob | null>(null);
  const [sends, setSends] = useState<SmsJobSend[]>([]);
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const sendsIdsRef = useRef<Set<string>>(new Set());

  function subscribeToJob(jobId: string) {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    sendsIdsRef.current.clear();

    const channel = supabase
      .channel(`sms-job-${jobId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sms_jobs',
        filter: `id=eq.${jobId}`,
      }, (payload) => {
        setActiveJob(payload.new as SmsJob);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sms_sends',
        filter: `job_id=eq.${jobId}`,
      }, (payload) => {
        const row = payload.new as SmsJobSend;
        if (!sendsIdsRef.current.has(row.id)) {
          sendsIdsRef.current.add(row.id);
          setSends(prev => [row, ...prev]);
        }
      })
      .subscribe();

    channelRef.current = channel;
  }

  async function loadJob(job: SmsJob) {
    setActiveJob(job);

    const { data: existingSends } = await supabase
      .from('sms_sends')
      .select('*')
      .eq('job_id', job.id)
      .order('created_at', { ascending: false });

    const rows = (existingSends || []) as SmsJobSend[];
    sendsIdsRef.current = new Set(rows.map(r => r.id));
    setSends(rows);
    subscribeToJob(job.id);
  }

  // On mount: reconnect to any active job
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;

      const { data: jobs } = await supabase
        .from('sms_jobs')
        .select('*')
        .in('status', ['scheduled', 'running'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (jobs && jobs.length > 0) {
        await loadJob(jobs[0] as SmsJob);
        toast.info('Disparo em andamento reconectado automaticamente');
      }
    });

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function callFn(fn: string, body: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sessão expirada. Faça login novamente.');

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    let responseData: Record<string, unknown> = {};
    try { responseData = await res.json(); } catch { /* empty body */ }

    if (!res.ok) throw new Error(String(responseData?.error || responseData?.message || `Erro ${res.status}`));
    if (responseData?.error) throw new Error(String(responseData.error));
    return responseData;
  }

  async function handlePreview() {
    setPreviewing(true);
    setPreviewCount(null);
    try {
      const payload: Record<string, unknown> = { mode: 'list', audience };
      if (audience === 'custom') payload.custom_numbers = customNumbers.split('\n').map(s => s.trim()).filter(Boolean);
      const data = await callFn('send-sms', payload);
      const count = (data?.recipients ?? []).length;
      setPreviewCount(count);
      toast.success(`${count} destinatário${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao buscar destinatários');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleStartJob() {
    if (!message.trim()) { toast.error('Digite a mensagem antes de enviar'); return; }
    if (audience === 'custom' && !customNumbers.trim()) { toast.error('Adicione pelo menos um número'); return; }

    setCreating(true);
    setSends([]);
    try {
      const payload: Record<string, unknown> = {
        mode: 'create-job',
        audience,
        message: message.trim(),
        delay_ms: delayMs,
      };
      if (audience === 'custom') payload.custom_numbers = customNumbers.split('\n').map(s => s.trim()).filter(Boolean);

      const data = await callFn('send-sms', payload);
      const { job_id, total } = data;

      toast.success(`Disparo criado! ${total} destinatários na fila. Iniciando...`);

      const { data: jobRow } = await supabase.from('sms_jobs').select('*').eq('id', job_id).single();
      if (jobRow) await loadJob(jobRow as SmsJob);

      // Fire-and-forget: start first batch immediately without waiting for cron (up to 60s)
      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-sms-job`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ job_id }),
        }
      ).catch(() => { /* cron will pick it up within 60s */ });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar disparo');
    } finally {
      setCreating(false);
    }
  }

  async function handleCancel() {
    if (!activeJob) return;
    setCancelling(true);
    try {
      await callFn('send-sms', { mode: 'cancel-job', job_id: activeJob.id });
      setActiveJob(prev => prev ? { ...prev, status: 'cancelled' } : null);
      toast.info('Disparo cancelado. O lote atual ainda será concluído.');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao cancelar');
    } finally {
      setCancelling(false);
    }
  }

  async function handleRefresh() {
    if (!activeJob) return;
    const { data: jobRow } = await supabase.from('sms_jobs').select('*').eq('id', activeJob.id).single();
    if (jobRow) await loadJob(jobRow as SmsJob);
    toast.success('Reconectado');
  }

  async function handleClearHistory() {
    // Cancel any active job first
    if (activeJob && (activeJob.status === 'scheduled' || activeJob.status === 'running')) {
      await callFn('send-sms', { mode: 'cancel-job', job_id: activeJob.id }).catch(() => {});
    }
    await supabase.from('sms_sends').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('sms_jobs').delete().in('status', ['completed', 'cancelled', 'failed']);
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    setActiveJob(null);
    setSends([]);
    sendsIdsRef.current.clear();
    toast.success('Histórico limpo — todos os contatos voltarão a aparecer');
  }

  const isJobActive = activeJob && (activeJob.status === 'scheduled' || activeJob.status === 'running');
  const progressPct = activeJob && activeJob.total > 0
    ? Math.round(((activeJob.sent + activeJob.failed) / activeJob.total) * 100)
    : 0;

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
              <Button variant="outline" size="sm"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 flex-shrink-0">
                <Trash2 className="w-4 h-4 mr-2" /> Limpar histórico
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-background-paper border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">Limpar histórico de envios?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Todos os registros serão removidos. Os contatos voltarão a aparecer nas próximas listas.
                  {isJobActive && ' O disparo em andamento será cancelado.'}
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

        {/* Active Job Status Card */}
        {activeJob && (
          <Card className={`border ${
            activeJob.status === 'completed' ? 'border-green-500/30 bg-green-500/5' :
            activeJob.status === 'cancelled' || activeJob.status === 'failed' ? 'border-border bg-secondary/30' :
            'border-blue-500/30 bg-blue-500/5'
          }`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {(activeJob.status === 'running') && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                  {activeJob.status === 'scheduled'  && <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />}
                  {activeJob.status === 'completed'  && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  {(activeJob.status === 'cancelled' || activeJob.status === 'failed') && <StopCircle className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-sm font-medium text-foreground">
                    {activeJob.status === 'running'   ? 'Disparando em segundo plano...' :
                     activeJob.status === 'scheduled' ? 'Na fila — aguardando próximo ciclo...' :
                     activeJob.status === 'completed' ? 'Disparo concluído' :
                     activeJob.status === 'cancelled' ? 'Disparo cancelado' : 'Disparo falhou'}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    ({activeJob.processed_index} / {activeJob.total} processados)
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {activeJob.sent}
                  </span>
                  <span className="text-xs text-red-400 font-medium flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> {activeJob.failed}
                  </span>
                  {isJobActive && (
                    <>
                      <Button variant="ghost" size="sm" onClick={handleRefresh}
                        className="h-7 px-2 text-muted-foreground hover:text-foreground text-xs">
                        <RefreshCw className="w-3 h-3 mr-1" /> Atualizar
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelling}
                        className="h-7 px-2 border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs">
                        {cancelling
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <><StopCircle className="w-3 h-3 mr-1" /> Cancelar</>}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    activeJob.status === 'completed' ? 'bg-green-500' :
                    activeJob.status === 'cancelled' || activeJob.status === 'failed' ? 'bg-muted-foreground/50' :
                    'bg-blue-500'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{progressPct}% concluído</span>
                {isJobActive && (
                  <span className="text-xs text-blue-400/80">
                    Você pode fechar esta página — o disparo continua em segundo plano
                  </span>
                )}
                {activeJob.status === 'completed' && (
                  <span className="text-xs text-green-400 font-medium">
                    ✓ {activeJob.sent} enviados · {activeJob.failed} falhas
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aviso Twilio Trial */}
        <div className="flex gap-3 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <span className="text-yellow-400 font-medium">Atenção: </span>
              Contas Twilio trial só enviam para números verificados e adicionam prefixo "Sent from a Twilio trial account".
            </p>
            <p>Para enviar para qualquer número sem prefixo, faça o <strong className="text-foreground">upgrade da conta</strong> em Twilio Console → Billing → Upgrade.</p>
          </div>
        </div>

        {/* 1. Mensagem */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">1. Mensagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const gsm7 = isGSM7(message)
              const limit = gsm7 ? 160 : 70
              const segLimit = gsm7 ? 153 : 67
              const chars = gsm7 ? countGSM7(message) : message.length
              const segments = chars <= limit ? 1 : Math.ceil(chars / segLimit)
              return (
                <div className="flex gap-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    {message.trim() && !gsm7
                      ? <>Sua mensagem contém caracteres <strong className="text-yellow-400">Unicode</strong> (ex: ã, â, ô, ê) — limite reduzido para <strong className="text-foreground">70 caracteres</strong> por SMS. Use apenas letras sem acento para o limite padrão de 160.</>
                      : <>SMS suporta <strong className="text-foreground">160 caracteres</strong> (GSM-7). Acima disso, cada 153 chars = 1 SMS extra. Sem formatação.</>
                    }
                  </p>
                </div>
              )
            })()}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-sm text-muted-foreground">Texto da mensagem <span className="text-red-400">*</span></Label>
                {(() => {
                  const gsm7 = isGSM7(message)
                  const limit = gsm7 ? 160 : 70
                  const segLimit = gsm7 ? 153 : 67
                  const chars = gsm7 ? countGSM7(message) : message.length
                  const segments = chars <= limit ? 1 : Math.ceil(chars / segLimit)
                  const over = chars > limit
                  return (
                    <span className={`text-xs font-medium ${over ? 'text-yellow-400' : chars > limit * 0.875 ? 'text-yellow-500/70' : 'text-muted-foreground'}`}>
                      {chars}/{limit}{!gsm7 && ' Unicode'}{segments > 1 && ` · ${segments} SMS`}
                    </span>
                  )
                })()}
              </div>
              <Textarea
                value={message}
                onChange={e => { setMessage(e.target.value); setPreviewCount(null); }}
                placeholder="OneMed: Seu trial expirou! Acesse onemedcursos.com.br e garanta seu acesso completo com 20% OFF usando o cupom ONEMED20."
                rows={5}
                disabled={!!isJobActive}
                className="bg-background border-border text-sm resize-none disabled:opacity-60"
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

        {/* 2. Público-alvo */}
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
                      <button key={opt.value}
                        disabled={!!isJobActive}
                        onClick={() => { setAudience(opt.value); setPreviewCount(null); }}
                        className={`flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
                  onChange={e => { setCustomNumbers(e.target.value); setPreviewCount(null); }}
                  placeholder={`5563999849659\n5511987654321\n+55 41 98765-4321`}
                  rows={5}
                  disabled={!!isJobActive}
                  className="bg-background border-border font-mono text-sm resize-none disabled:opacity-60"
                />
                <p className="text-xs text-muted-foreground mt-1">Aceita qualquer formato: com/sem +55, traços ou espaços.</p>
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="outline" size="sm" onClick={handlePreview}
                disabled={previewing || !!isJobActive || (audience === 'custom' && !customNumbers.trim())}
                className="border-border text-muted-foreground hover:text-foreground">
                {previewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                Ver quantos serão impactados
              </Button>
              {previewCount !== null && (
                <span className="text-sm text-blue-400 font-medium">
                  {previewCount} destinatário{previewCount !== 1 ? 's' : ''} encontrado{previewCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Configurações e Envio */}
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
                  <button key={opt.value} onClick={() => setDelayMs(opt.value)} disabled={!!isJobActive}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
                O disparo ocorre em <strong className="text-foreground">segundo plano</strong> — você pode fechar esta página com segurança.
                Ao voltar, o progresso será reconectado automaticamente. ~US$0,05 por SMS para Brasil.
              </p>
            </div>

            {isJobActive ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                <p className="text-sm text-blue-400">
                  Disparo em andamento — aguarde a conclusão ou cancele para iniciar um novo.
                </p>
              </div>
            ) : (
              <Button onClick={handleStartJob} disabled={creating || !message.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white" size="lg">
                {creating
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando disparo...</>
                  : <><Send className="w-4 h-4 mr-2" />Disparar SMS</>}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Resultados em tempo real */}
        {sends.length > 0 && (
          <Card className="bg-background-paper border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-foreground">
                  Resultados em tempo real
                  {isJobActive && <span className="ml-2 inline-flex items-center gap-1 text-xs text-blue-400 font-normal">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" /> ao vivo
                  </span>}
                </CardTitle>
                <span className="text-xs text-muted-foreground">{sends.length} registros</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background-paper border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-mono uppercase text-muted-foreground">Telefone</th>
                      <th className="text-left px-4 py-2 text-xs font-mono uppercase text-muted-foreground hidden sm:table-cell">Email</th>
                      <th className="text-left px-4 py-2 text-xs font-mono uppercase text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sends.map((item) => (
                      <tr key={item.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-2 font-mono text-xs text-foreground">{item.phone}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground hidden sm:table-cell">{item.email || '—'}</td>
                        <td className="px-4 py-2">
                          {item.status === 'sent' ? (
                            <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Enviado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-400 text-xs font-medium" title={item.error_message}>
                              <XCircle className="w-3.5 h-3.5" /> Falhou
                              {item.error_message && (
                                <span className="text-red-300/70 font-normal truncate max-w-[120px] sm:max-w-[200px]">
                                  {' · '}{item.error_message}
                                </span>
                              )}
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

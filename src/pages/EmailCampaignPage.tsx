import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTimeSP } from '@/lib/utils';
import {
  Mail, Users, DollarSign, CheckCircle2, XCircle,
  Loader2, Send, Clock, StopCircle, CalendarClock,
  RefreshCw, Ban, Zap,
} from 'lucide-react';

// ─── Timezone SP ──────────────────────────────────────────────────────────────
// Brasil não tem horário de verão desde 2019: SP é sempre UTC-3

/** Retorna "YYYY-MM-DDTHH:MM" no horário de São Paulo para usar em datetime-local */
function getSPDatetimeLocal(): string {
  return new Date()
    .toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    .slice(0, 16)
    .replace(' ', 'T');
}

/** Converte string "YYYY-MM-DDTHH:MM" (horário SP/UTC-3) para ISO UTC */
function spLocalToUTC(localStr: string): string {
  return new Date(`${localStr}:00-03:00`).toISOString();
}

// ─── Template presets ─────────────────────────────────────────────────────────

type TemplateType = 'followup_1d' | 'followup_7d' | 'followup_30d' | 'free_trial' | 'custom';
type RecipientType = 'trials' | 'buyers' | 'both' | 'manual';
type SendMode = 'now' | 'scheduled';

interface FollowupFields {
  subject: string;
  subjectText: string;
  message: string;
  couponCode: string;
  discount: number;
  urgency: string;
  annualPrice: string;
  lifetimePrice: string;
}

interface FreeTrialFields {
  subject: string;
  subjectText: string;
  message: string;
  urgency: string;
}

interface CustomFields {
  subject: string;
  body: string;
}

const PRESETS: Record<Exclude<TemplateType, 'custom'>, FollowupFields> = {
  followup_1d: {
    subject: 'Sentimos sua falta! - OneMed',
    subjectText: 'Sentimos sua falta!',
    message: 'Notamos que voce experimentou nosso conteudo ontem. Esperamos que tenha gostado!',
    couponCode: 'ONEMED10',
    discount: 10,
    urgency: 'Aproveite nossa oferta especial e garanta acesso ilimitado a todo o conteudo.',
    annualPrice: 'R$ 179,10',
    lifetimePrice: 'R$ 269,10',
  },
  followup_7d: {
    subject: 'Uma semana se passou... - OneMed',
    subjectText: 'Uma semana se passou...',
    message: 'Faz uma semana que voce testou o OneMed. Sentimos sua falta!',
    couponCode: 'ONEMED20',
    discount: 20,
    urgency: 'Milhares de medicos ja garantiram acesso. Nao fique de fora!',
    annualPrice: 'R$ 159,20',
    lifetimePrice: 'R$ 239,20',
  },
  followup_30d: {
    subject: 'Ultima chance! - OneMed',
    subjectText: 'Ultima chance!',
    message: 'Faz um mes que voce conheceu o OneMed. Esta pode ser sua ultima oportunidade!',
    couponCode: 'ONEMED30',
    discount: 30,
    urgency: 'Garanta seu acesso agora e transforme sua carreira medica.',
    annualPrice: 'R$ 139,30',
    lifetimePrice: 'R$ 209,30',
  },
};

const FREE_TRIAL_PRESET: FreeTrialFields = {
  subject: 'Experimente o OneMed gratuitamente! - OneMed',
  subjectText: 'Experimente Gratis!',
  message: 'Conheca o maior acervo de conteudos medicos da America Latina. Teste gratis por 30 minutos e veja tudo o que preparamos para voce!',
  urgency: 'Acesse agora e descubra +530 cursos e +9.000 livros medicos. Sem compromisso!',
};

const TEMPLATE_OPTIONS: { id: TemplateType; label: string; sublabel: string }[] = [
  { id: 'followup_1d',  label: 'Acompanhamento 1 dia',    sublabel: 'Cupom 10% · ONEMED10' },
  { id: 'followup_7d',  label: 'Acompanhamento 7 dias',   sublabel: 'Cupom 20% · ONEMED20' },
  { id: 'followup_30d', label: 'Acompanhamento 30 dias',  sublabel: 'Cupom 30% · ONEMED30' },
  { id: 'free_trial',   label: 'Convite Teste Gratis',     sublabel: 'Botao para teste gratis' },
  { id: 'custom',       label: 'Email personalizado',      sublabel: 'Escreva do zero' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface LogEntry { email: string; status: 'success' | 'error'; error?: string }

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  scheduled:  { label: 'Agendado',   cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  running:    { label: 'Enviando',   cls: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  completed:  { label: 'Concluído',  cls: 'text-green-400 bg-green-400/10 border-green-400/30' },
  failed:     { label: 'Falhou',     cls: 'text-red-400 bg-red-400/10 border-red-400/30' },
  cancelled:  { label: 'Cancelado',  cls: 'text-muted-foreground bg-secondary border-border' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function EmailCampaignPage() {
  // Template
  const [templateType, setTemplateType] = useState<TemplateType>('followup_1d');
  const [followupFields, setFollowupFields] = useState<FollowupFields>({ ...PRESETS.followup_1d });
  const [freeTrialFields, setFreeTrialFields] = useState<FreeTrialFields>({ ...FREE_TRIAL_PRESET });
  const [customFields, setCustomFields] = useState<CustomFields>({ subject: '', body: '' });

  // Recipients
  const [recipientType, setRecipientType] = useState<RecipientType>('trials');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [manualEmails, setManualEmails] = useState('');
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const fetchSeqRef = useRef(0);

  // Send mode
  const [sendMode, setSendMode] = useState<SendMode>('now');
  const [scheduledAt, setScheduledAt] = useState<string>(() => {
    // Default: 10 minutos à frente no horário SP
    const sp = new Date();
    sp.setMinutes(sp.getMinutes() + 10);
    return sp.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 16).replace(' ', 'T');
  });

  // Sending now
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ total: 0, sent: 0, failed: 0, current: 0 });
  const [log, setLog] = useState<LogEntry[]>([]);
  const [done, setDone] = useState(false);
  const shouldStopRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Scheduled campaigns list
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // ── Fetch recipients ────────────────────────────────────────────────────────

  const fetchRecipients = useCallback(async (type: RecipientType) => {
    // Sequence guard: descarta resultados de fetches anteriores
    const seq = ++fetchSeqRef.current;
    setLoadingRecipients(true);

    const PAGE_SIZE = 1000;

    // Busca todas as páginas de uma query paginada
    const fetchAllPages = async <T extends { email?: string }>(
      builder: () => ReturnType<typeof supabase.from>
    ): Promise<string[]> => {
      const emails: string[] = [];
      let page = 0;
      while (true) {
        const from = page * PAGE_SIZE;
        const { data, error } = await (builder() as any)
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw new Error(error.message);
        const rows: T[] = data || [];
        rows.forEach((r) => r.email && emails.push((r.email as string).toLowerCase()));
        if (rows.length < PAGE_SIZE) break;
        page++;
      }
      return emails;
    };

    try {
      const all: string[] = [];

      if (type === 'trials' || type === 'both') {
        const emails = await fetchAllPages(() =>
          supabase.from('accesses').select('email').eq('access_type', 'trial')
        );
        all.push(...emails);
      }

      if (type === 'buyers' || type === 'both') {
        const emails = await fetchAllPages(() =>
          supabase.from('buyers').select('email').eq('status', 'approved')
        );
        all.push(...emails);
      }

      if (seq === fetchSeqRef.current) {
        setRecipients([...new Set(all)]);
      }
    } catch (err: any) {
      if (seq === fetchSeqRef.current) {
        toast.error(err?.message || 'Erro ao carregar destinatários');
      }
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoadingRecipients(false);
      }
    }
  }, []);

  useEffect(() => {
    if (recipientType === 'manual') {
      setLoadingRecipients(false);
      return;
    }
    fetchRecipients(recipientType);
  }, [recipientType, fetchRecipients]);

  // Parse manual emails
  useEffect(() => {
    if (recipientType !== 'manual') return;
    const emails = manualEmails
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e && e.includes('@'));
    setRecipients([...new Set(emails)]);
  }, [manualEmails, recipientType]);

  // ── Fetch campaigns ─────────────────────────────────────────────────────────

  // ── email_campaigns: cast necessário pois não está nos tipos gerados ──────────

  const fetchCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const { data, error } = await (supabase as any)
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error) setCampaigns(data || []);
    } catch {
      // Tabela pode ainda não existir em ambientes antigos
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // Auto-refresh campaigns that are scheduled/running
  useEffect(() => {
    const hasPending = campaigns.some(c => c.status === 'scheduled' || c.status === 'running');
    if (!hasPending) return;
    const interval = setInterval(fetchCampaigns, 15000);
    return () => clearInterval(interval);
  }, [campaigns, fetchCampaigns]);

  // ── Auto-scroll log ─────────────────────────────────────────────────────────

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  // ── Template change ─────────────────────────────────────────────────────────

  const handleTemplateChange = (t: TemplateType) => {
    setTemplateType(t);
    if (t === 'free_trial') {
      setFreeTrialFields({ ...FREE_TRIAL_PRESET });
    } else if (t !== 'custom') {
      setFollowupFields({ ...PRESETS[t] });
    }
    setLog([]);
    setDone(false);
  };

  // ── Build payload ────────────────────────────────────────────────────────────

  const getSubject = () => {
    if (templateType === 'custom') return customFields.subject;
    if (templateType === 'free_trial') return freeTrialFields.subject;
    return followupFields.subject;
  };

  const getTemplatePayload = () => {
    if (templateType === 'custom') {
      return { templateType: 'custom', templateData: { body: customFields.body } };
    }
    if (templateType === 'free_trial') {
      return {
        templateType: 'free_trial',
        templateData: {
          subjectText: freeTrialFields.subjectText,
          message: freeTrialFields.message,
          urgency: freeTrialFields.urgency,
        },
      };
    }
    return {
      templateType: 'followup',
      templateData: {
        subjectText:  followupFields.subjectText,
        message:      followupFields.message,
        couponCode:   followupFields.couponCode,
        discount:     followupFields.discount,
        urgency:      followupFields.urgency,
        annualPrice:  followupFields.annualPrice,
        lifetimePrice: followupFields.lifetimePrice,
      },
    };
  };

  // ── Validate ────────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    if (recipients.length === 0) { toast.error('Nenhum destinatário selecionado'); return false; }
    if (!getSubject().trim()) { toast.error('Informe o assunto do email'); return false; }
    if (templateType === 'custom' && !customFields.body.trim()) { toast.error('Escreva o corpo do email'); return false; }
    return true;
  };

  // ── Send now ─────────────────────────────────────────────────────────────────

  const startSendingNow = async () => {
    if (!validate()) return;
    shouldStopRef.current = false;
    setSending(true);
    setDone(false);
    setLog([]);
    setProgress({ total: recipients.length, sent: 0, failed: 0, current: 0 });

    let sent = 0; let failed = 0;
    const subject = getSubject();
    const { templateType: tType, templateData } = getTemplatePayload();

    for (let i = 0; i < recipients.length; i++) {
      if (shouldStopRef.current) break;
      const email = recipients[i];
      setProgress(p => ({ ...p, current: i + 1 }));

      try {
        const invokeController = new AbortController();
        const invokeTimeout = setTimeout(() => invokeController.abort(), 30000);
        let data: any, error: any;
        try {
          ({ data, error } = await supabase.functions.invoke('send-custom-email', {
            body: { to: email, subject, templateType: tType, templateData },
            signal: invokeController.signal,
          }));
        } finally {
          clearTimeout(invokeTimeout);
        }
        if (error) throw new Error(error.message || 'Erro ao enviar');
        if (data?.error) throw new Error(data.error);
        sent++;
        setProgress(p => ({ ...p, sent: p.sent + 1 }));
        setLog(l => [...l, { email, status: 'success' }]);
      } catch (err: any) {
        failed++;
        setProgress(p => ({ ...p, failed: p.failed + 1 }));
        setLog(l => [...l, { email, status: 'error', error: err.message }]);
      }

      if (i < recipients.length - 1 && !shouldStopRef.current) {
        const delay = 1000 + Math.floor(Math.random() * 4000); // 1–5s
        await new Promise(r => setTimeout(r, delay));
      }
    }

    setSending(false);
    setDone(true);
    if (shouldStopRef.current) {
      toast.warning(`Envio interrompido. ${sent} enviados, ${failed} erros.`);
    } else {
      toast.success(`Campanha concluída! ${sent} enviados, ${failed} erros.`);
    }
  };

  // ── Schedule ─────────────────────────────────────────────────────────────────

  const scheduleCampaign = async () => {
    if (!validate()) return;

    const scheduledUTC = spLocalToUTC(scheduledAt);
    if (new Date(scheduledUTC) <= new Date()) {
      toast.error('O horário agendado deve ser no futuro (horário de Brasília)');
      return;
    }

    const subject = getSubject();
    const { templateType: tType, templateData } = getTemplatePayload();

    try {
      const { error } = await (supabase as any).from('email_campaigns').insert({
        subject,
        template_type: tType,
        template_data: templateData,
        recipient_type: recipientType === 'manual' ? 'manual' : recipientType,
        recipient_emails: recipients,
        scheduled_at: scheduledUTC,
        total_count: recipients.length,
      });
      if (error) throw error;
      toast.success(`Campanha agendada para ${formatDateTimeSP(scheduledUTC)} (Brasília)`);
      fetchCampaigns();
    } catch (err: any) {
      toast.error('Erro ao agendar: ' + err.message);
    }
  };

  // ── Cancel campaign ──────────────────────────────────────────────────────────

  const cancelCampaign = async (id: string) => {
    const { error } = await (supabase as any)
      .from('email_campaigns')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('status', 'scheduled');
    if (error) { toast.error('Erro ao cancelar'); return; }
    toast.success('Campanha cancelada');
    fetchCampaigns();
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const currentSubject = getSubject();
  const currentTitle   = templateType === 'custom' ? customFields.subject : templateType === 'free_trial' ? freeTrialFields.subjectText : followupFields.subjectText;
  const currentCoupon  = templateType !== 'custom' && templateType !== 'free_trial' ? followupFields.couponCode : null;
  const currentDiscount = templateType !== 'custom' && templateType !== 'free_trial' ? followupFields.discount : null;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="font-secondary text-3xl font-bold text-foreground">Campanha de Email</h1>
          <p className="text-muted-foreground mt-1">
            Envie ou agende disparos para trials e compradores · Horário: <span className="text-foreground">Brasília (UTC-3)</span>
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">

          {/* ── LEFT ────────────────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Template */}
            <Card className="bg-background-paper border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Modelo de Email
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {TEMPLATE_OPTIONS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleTemplateChange(t.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      templateType === t.id
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-background hover:bg-secondary text-muted-foreground'
                    }`}
                  >
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs opacity-70 mt-0.5">{t.sublabel}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Content */}
            <Card className="bg-background-paper border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground">Conteúdo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {templateType === 'custom' ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs uppercase font-mono">Assunto</Label>
                      <Input
                        value={customFields.subject}
                        onChange={e => setCustomFields(f => ({ ...f, subject: e.target.value }))}
                        placeholder="Assunto do email..."
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs uppercase font-mono">Corpo do Email</Label>
                      <Textarea
                        value={customFields.body}
                        onChange={e => setCustomFields(f => ({ ...f, body: e.target.value }))}
                        placeholder="Escreva o texto do email. Separe parágrafos com uma linha em branco."
                        rows={10}
                        className="bg-background border-border text-foreground resize-none"
                      />
                    </div>
                  </>
                ) : templateType === 'free_trial' ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs uppercase font-mono">Assunto</Label>
                      <Input value={freeTrialFields.subject} onChange={e => setFreeTrialFields(f => ({ ...f, subject: e.target.value }))} className="bg-background border-border text-foreground" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs uppercase font-mono">Título (h1 do email)</Label>
                      <Input value={freeTrialFields.subjectText} onChange={e => setFreeTrialFields(f => ({ ...f, subjectText: e.target.value }))} className="bg-background border-border text-foreground" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs uppercase font-mono">Mensagem introdutória</Label>
                      <Textarea value={freeTrialFields.message} onChange={e => setFreeTrialFields(f => ({ ...f, message: e.target.value }))} rows={3} className="bg-background border-border text-foreground resize-none" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs uppercase font-mono">Texto de urgência</Label>
                      <Textarea value={freeTrialFields.urgency} onChange={e => setFreeTrialFields(f => ({ ...f, urgency: e.target.value }))} rows={2} className="bg-background border-border text-foreground resize-none" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs uppercase font-mono">Assunto</Label>
                      <Input value={followupFields.subject} onChange={e => setFollowupFields(f => ({ ...f, subject: e.target.value }))} className="bg-background border-border text-foreground" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs uppercase font-mono">Título (h1 do email)</Label>
                      <Input value={followupFields.subjectText} onChange={e => setFollowupFields(f => ({ ...f, subjectText: e.target.value }))} className="bg-background border-border text-foreground" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs uppercase font-mono">Mensagem introdutória</Label>
                      <Textarea value={followupFields.message} onChange={e => setFollowupFields(f => ({ ...f, message: e.target.value }))} rows={3} className="bg-background border-border text-foreground resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs uppercase font-mono">Código do Cupom</Label>
                        <Input value={followupFields.couponCode} onChange={e => setFollowupFields(f => ({ ...f, couponCode: e.target.value.toUpperCase() }))} className="bg-background border-border text-foreground font-mono" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs uppercase font-mono">Desconto (%)</Label>
                        <Input type="number" min={1} max={99} value={followupFields.discount} onChange={e => setFollowupFields(f => ({ ...f, discount: Number(e.target.value) }))} className="bg-background border-border text-foreground" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs uppercase font-mono">Texto de urgência</Label>
                      <Textarea value={followupFields.urgency} onChange={e => setFollowupFields(f => ({ ...f, urgency: e.target.value }))} rows={2} className="bg-background border-border text-foreground resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs uppercase font-mono">Preço Anual c/ desconto</Label>
                        <Input value={followupFields.annualPrice} onChange={e => setFollowupFields(f => ({ ...f, annualPrice: e.target.value }))} placeholder="R$ 179,10" className="bg-background border-border text-foreground" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs uppercase font-mono">Preço Vitalício c/ desconto</Label>
                        <Input value={followupFields.lifetimePrice} onChange={e => setFollowupFields(f => ({ ...f, lifetimePrice: e.target.value }))} placeholder="R$ 269,10" className="bg-background border-border text-foreground" />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT ───────────────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Preview */}
            <Card className="bg-background-paper border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground">Pré-visualização</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-[#111111] rounded-lg border border-red-900/30 p-5 text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 pb-3 border-b border-white/10">
                    <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">+</div>
                    <span className="text-white font-bold">One<span className="text-red-500">Med</span></span>
                  </div>
                  <p className="text-white font-bold text-lg leading-tight">
                    {currentTitle || <span className="text-slate-500 italic text-sm">Título do email</span>}
                  </p>
                  {currentCoupon && (
                    <div className="border-2 border-dashed border-green-500/50 rounded-lg py-3 px-4 bg-green-500/10">
                      <p className="text-green-400 text-xs font-bold uppercase mb-1">Cupom Exclusivo</p>
                      <p className="text-white text-xl font-bold tracking-widest">{currentCoupon}</p>
                      <p className="text-green-400 font-bold text-sm">{currentDiscount}% DE DESCONTO</p>
                    </div>
                  )}
                  {templateType === 'free_trial' && (
                    <div className="border border-green-500/30 rounded-lg py-3 px-4 bg-green-500/10">
                      <p className="text-green-400 text-xs font-bold uppercase mb-1">Acesso Gratuito</p>
                      <p className="text-white text-sm">30 minutos para explorar todo o conteudo</p>
                    </div>
                  )}
                  <p className="text-slate-500 text-xs">Assunto: <span className="text-slate-400">{currentSubject || '—'}</span></p>
                  <div className="inline-block bg-red-600 text-white rounded-lg px-5 py-2 text-sm font-bold">
                    {templateType === 'free_trial' ? 'Quero Testar Gratis' : templateType === 'custom' ? 'Acessar OneMed' : 'Usar Cupom e Garantir Acesso'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recipients */}
            <Card className="bg-background-paper border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Destinatários
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { id: 'trials',  label: 'Trials',       icon: Clock       },
                    { id: 'buyers',  label: 'Compradores',   icon: DollarSign  },
                    { id: 'both',    label: 'Ambos',         icon: Users       },
                    { id: 'manual',  label: 'Manual',        icon: Mail        },
                  ] as { id: RecipientType; label: string; icon: any }[]).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setRecipientType(opt.id)}
                      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border text-xs font-medium transition-colors ${
                        recipientType === opt.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      <opt.icon className="w-4 h-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>
                {recipientType === 'manual' && (
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs uppercase font-mono">Lista de emails (um por linha ou separados por vírgula)</Label>
                    <Textarea
                      value={manualEmails}
                      onChange={e => setManualEmails(e.target.value)}
                      placeholder={"email1@exemplo.com\nemail2@exemplo.com\nemail3@exemplo.com"}
                      rows={6}
                      className="bg-background border-border text-foreground resize-none font-mono text-xs"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3 bg-background rounded-lg border border-border">
                  {loadingRecipients ? (
                    <span className="text-muted-foreground text-sm flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
                    </span>
                  ) : (
                    <>
                      <span className="text-muted-foreground text-sm">Total de destinatários</span>
                      <span className="text-foreground font-bold text-lg">{recipients.length}</span>
                    </>
                  )}
                </div>
                {recipients.length > 0 && recipientType !== 'manual' && (
                  <div className="max-h-20 overflow-y-auto space-y-1 pr-1">
                    {recipients.slice(0, 4).map(e => (
                      <p key={e} className="text-xs text-muted-foreground truncate px-1">{e}</p>
                    ))}
                    {recipients.length > 4 && (
                      <p className="text-xs text-muted-foreground px-1">... e mais {recipients.length - 4}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Send / Schedule */}
            <Card className="bg-background-paper border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" />
                  Envio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Mode toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSendMode('now')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      sendMode === 'now'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    Enviar agora
                  </button>
                  <button
                    onClick={() => setSendMode('scheduled')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      sendMode === 'scheduled'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <CalendarClock className="w-4 h-4" />
                    Agendar
                  </button>
                </div>

                {/* Scheduled datetime picker */}
                {sendMode === 'scheduled' && (
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs uppercase font-mono">
                      Data e hora · Horário de Brasília (UTC-3)
                    </Label>
                    <Input
                      type="datetime-local"
                      value={scheduledAt}
                      min={getSPDatetimeLocal()}
                      onChange={e => setScheduledAt(e.target.value)}
                      className="bg-background border-border text-foreground"
                    />
                    <p className="text-xs text-muted-foreground">
                      O sistema enviará automaticamente na hora marcada, mesmo com o painel fechado.
                    </p>
                  </div>
                )}

                {/* Delay note */}
                <p className="text-xs text-muted-foreground">
                  {sendMode === 'now'
                    ? 'Delay aleatório de 1–5s entre cada email (anti-spam).'
                    : 'Delay de 1s entre envios. Campanhas grandes processadas em lotes por minuto.'}
                </p>

                {/* Progress (send now only) */}
                {sendMode === 'now' && (sending || done) && progress.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{progress.current} / {progress.total}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-green-400">{progress.sent} ok</span>
                        {progress.failed > 0 && <span className="text-red-400">{progress.failed} erro</span>}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300 rounded-full"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action button */}
                {sendMode === 'now' ? (
                  !sending ? (
                    <Button onClick={startSendingNow} disabled={loadingRecipients || recipients.length === 0} className="w-full">
                      <Send className="w-4 h-4 mr-2" />
                      Enviar para {recipients.length} email{recipients.length !== 1 ? 's' : ''}
                    </Button>
                  ) : (
                    <Button variant="destructive" onClick={() => { shouldStopRef.current = true; }} className="w-full">
                      <StopCircle className="w-4 h-4 mr-2" />
                      Interromper envio
                    </Button>
                  )
                ) : (
                  <Button onClick={scheduleCampaign} disabled={loadingRecipients || recipients.length === 0} className="w-full">
                    <CalendarClock className="w-4 h-4 mr-2" />
                    Agendar {recipients.length} email{recipients.length !== 1 ? 's' : ''}
                  </Button>
                )}

                {/* Send log */}
                {log.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-2 bg-background">
                    {log.map((entry, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 px-1">
                        {entry.status === 'success'
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                          : <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                        <span className="text-xs text-foreground truncate flex-1">{entry.email}</span>
                        {entry.error && <span className="text-xs text-red-400 truncate max-w-28" title={entry.error}>{entry.error}</span>}
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                )}

                {done && !sending && (
                  <p className="text-xs text-center text-muted-foreground">
                    Campanha finalizada — {progress.sent} enviados, {progress.failed} com erro.
                  </p>
                )}
              </CardContent>
            </Card>

          </div>
        </div>

        {/* ── Campanhas agendadas ─────────────────────────────────────────────── */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-primary" />
                Campanhas Agendadas
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={fetchCampaigns} disabled={loadingCampaigns} className="text-muted-foreground hover:text-foreground">
                <RefreshCw className={`w-4 h-4 ${loadingCampaigns ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Assunto', 'Destinatários', 'Agendado para (Brasília)', 'Progresso', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-mono uppercase text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => {
                    const st = STATUS_LABELS[c.status] || STATUS_LABELS.cancelled;
                    const pct = c.total_count > 0 ? Math.round((c.processed_index / c.total_count) * 100) : 0;
                    return (
                      <tr key={c.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-foreground max-w-48 truncate">{c.subject}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {c.total_count} {c.recipient_type === 'trials' ? 'trials' : c.recipient_type === 'buyers' ? 'compradores' : 'total'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateTimeSP(c.scheduled_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-24">
                            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {c.sent_count}/{c.total_count}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${st.cls}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {c.status === 'scheduled' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelCampaign(c.id)}
                              className="text-muted-foreground hover:text-red-400 h-7 px-2"
                            >
                              <Ban className="w-3.5 h-3.5 mr-1" />
                              Cancelar
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {campaigns.length === 0 && !loadingCampaigns && (
                <p className="text-muted-foreground text-center py-10 text-sm">Nenhuma campanha encontrada</p>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </AdminLayout>
  );
}

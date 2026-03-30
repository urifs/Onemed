import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Mail, Users, DollarSign, CheckCircle2, XCircle,
  Loader2, Send, Clock, StopCircle,
} from 'lucide-react';

// ─── Template presets ────────────────────────────────────────────────────────

type TemplateType = 'followup_1d' | 'followup_7d' | 'followup_30d' | 'custom';
type RecipientType = 'trials' | 'buyers' | 'both';

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

const TEMPLATE_OPTIONS: { id: TemplateType; label: string; sublabel: string }[] = [
  { id: 'followup_1d', label: 'Acompanhamento 1 dia', sublabel: 'Cupom 10% · ONEMED10' },
  { id: 'followup_7d', label: 'Acompanhamento 7 dias', sublabel: 'Cupom 20% · ONEMED20' },
  { id: 'followup_30d', label: 'Acompanhamento 30 dias', sublabel: 'Cupom 30% · ONEMED30' },
  { id: 'custom', label: 'Email personalizado', sublabel: 'Escreva do zero' },
];

// ─── Log entry ───────────────────────────────────────────────────────────────

interface LogEntry {
  email: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EmailCampaignPage() {
  // Template
  const [templateType, setTemplateType] = useState<TemplateType>('followup_1d');
  const [followupFields, setFollowupFields] = useState<FollowupFields>({ ...PRESETS.followup_1d });
  const [customFields, setCustomFields] = useState<CustomFields>({ subject: '', body: '' });

  // Recipients
  const [recipientType, setRecipientType] = useState<RecipientType>('trials');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Sending
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ total: 0, sent: 0, failed: 0, current: 0 });
  const [log, setLog] = useState<LogEntry[]>([]);
  const [done, setDone] = useState(false);
  const shouldStopRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── Load recipients ────────────────────────────────────────────────────────

  const fetchRecipients = useCallback(async (type: RecipientType) => {
    setLoadingRecipients(true);
    try {
      const allEmails: string[] = [];

      if (type === 'trials' || type === 'both') {
        const { data } = await supabase.from('accesses').select('email').eq('access_type', 'trial');
        (data || []).forEach(r => allEmails.push(r.email.toLowerCase()));
      }

      if (type === 'buyers' || type === 'both') {
        const { data } = await supabase.from('buyers').select('email').eq('status', 'approved');
        (data || []).forEach(r => allEmails.push(r.email.toLowerCase()));
      }

      setRecipients([...new Set(allEmails)]);
    } catch {
      toast.error('Erro ao carregar destinatários');
    } finally {
      setLoadingRecipients(false);
    }
  }, []);

  useEffect(() => { fetchRecipients(recipientType); }, [recipientType, fetchRecipients]);

  // ── Auto-scroll log ────────────────────────────────────────────────────────

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  // ── When template changes, reset fields to preset ─────────────────────────

  const handleTemplateChange = (t: TemplateType) => {
    setTemplateType(t);
    if (t !== 'custom') {
      setFollowupFields({ ...PRESETS[t] });
    }
    setLog([]);
    setDone(false);
  };

  // ── Build payload ──────────────────────────────────────────────────────────

  const buildPayload = (to: string) => {
    if (templateType === 'custom') {
      return {
        to,
        subject: customFields.subject,
        templateType: 'custom',
        templateData: { body: customFields.body },
      };
    }
    return {
      to,
      subject: followupFields.subject,
      templateType: 'followup',
      templateData: {
        subjectText: followupFields.subjectText,
        message: followupFields.message,
        couponCode: followupFields.couponCode,
        discount: followupFields.discount,
        urgency: followupFields.urgency,
        annualPrice: followupFields.annualPrice,
        lifetimePrice: followupFields.lifetimePrice,
      },
    };
  };

  // ── Send campaign ──────────────────────────────────────────────────────────

  const startSending = async () => {
    if (recipients.length === 0) {
      toast.error('Nenhum destinatário selecionado');
      return;
    }
    const subject = templateType === 'custom' ? customFields.subject : followupFields.subject;
    if (!subject.trim()) {
      toast.error('Informe o assunto do email');
      return;
    }
    if (templateType === 'custom' && !customFields.body.trim()) {
      toast.error('Escreva o corpo do email');
      return;
    }

    shouldStopRef.current = false;
    setSending(true);
    setDone(false);
    setLog([]);
    setProgress({ total: recipients.length, sent: 0, failed: 0, current: 0 });

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i++) {
      if (shouldStopRef.current) break;

      const email = recipients[i];
      setProgress(p => ({ ...p, current: i + 1 }));

      try {
        const { error } = await supabase.functions.invoke('send-custom-email', {
          body: buildPayload(email),
        });
        if (error) throw new Error(error.message || 'Erro desconhecido');
        sent++;
        setProgress(p => ({ ...p, sent: p.sent + 1 }));
        setLog(l => [...l, { email, status: 'success' }]);
      } catch (err: any) {
        failed++;
        setProgress(p => ({ ...p, failed: p.failed + 1 }));
        setLog(l => [...l, { email, status: 'error', error: err.message }]);
      }

      // Delay 1–5 seconds between sends (skip after last email)
      if (i < recipients.length - 1 && !shouldStopRef.current) {
        const delay = 1000 + Math.floor(Math.random() * 4000);
        await new Promise(resolve => setTimeout(resolve, delay));
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

  const stopSending = () => {
    shouldStopRef.current = true;
  };

  // ── Subject derived ────────────────────────────────────────────────────────

  const currentSubject = templateType === 'custom' ? customFields.subject : followupFields.subject;
  const currentTitle = templateType === 'custom' ? customFields.subject : followupFields.subjectText;
  const currentCoupon = templateType !== 'custom' ? followupFields.couponCode : null;
  const currentDiscount = templateType !== 'custom' ? followupFields.discount : null;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-secondary text-3xl font-bold text-foreground">Campanha de Email</h1>
          <p className="text-muted-foreground mt-1">Envie emails em massa para trials e compradores</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Template Selection */}
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

            {/* Content Editing */}
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
                        placeholder="Escreva o texto do email. Use linhas em branco para separar parágrafos."
                        rows={10}
                        className="bg-background border-border text-foreground resize-none"
                      />
                      <p className="text-xs text-muted-foreground">Separe parágrafos com uma linha em branco.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs uppercase font-mono">Assunto</Label>
                      <Input
                        value={followupFields.subject}
                        onChange={e => setFollowupFields(f => ({ ...f, subject: e.target.value }))}
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs uppercase font-mono">Título (h1 do email)</Label>
                      <Input
                        value={followupFields.subjectText}
                        onChange={e => setFollowupFields(f => ({ ...f, subjectText: e.target.value }))}
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs uppercase font-mono">Mensagem introdutória</Label>
                      <Textarea
                        value={followupFields.message}
                        onChange={e => setFollowupFields(f => ({ ...f, message: e.target.value }))}
                        rows={3}
                        className="bg-background border-border text-foreground resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs uppercase font-mono">Código do Cupom</Label>
                        <Input
                          value={followupFields.couponCode}
                          onChange={e => setFollowupFields(f => ({ ...f, couponCode: e.target.value.toUpperCase() }))}
                          className="bg-background border-border text-foreground font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs uppercase font-mono">Desconto (%)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          value={followupFields.discount}
                          onChange={e => setFollowupFields(f => ({ ...f, discount: Number(e.target.value) }))}
                          className="bg-background border-border text-foreground"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs uppercase font-mono">Texto de urgência</Label>
                      <Textarea
                        value={followupFields.urgency}
                        onChange={e => setFollowupFields(f => ({ ...f, urgency: e.target.value }))}
                        rows={2}
                        className="bg-background border-border text-foreground resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs uppercase font-mono">Preço Anual</Label>
                        <Input
                          value={followupFields.annualPrice}
                          onChange={e => setFollowupFields(f => ({ ...f, annualPrice: e.target.value }))}
                          placeholder="R$ 179,10"
                          className="bg-background border-border text-foreground"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs uppercase font-mono">Preço Vitalício</Label>
                        <Input
                          value={followupFields.lifetimePrice}
                          onChange={e => setFollowupFields(f => ({ ...f, lifetimePrice: e.target.value }))}
                          placeholder="R$ 269,10"
                          className="bg-background border-border text-foreground"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Preview */}
            <Card className="bg-background-paper border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground">Pré-visualização</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-[#111111] rounded-lg border border-red-900/30 p-5 text-center space-y-3">
                  {/* Logo mock */}
                  <div className="flex items-center justify-center gap-2 pb-3 border-b border-white/10">
                    <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">+</div>
                    <span className="text-white font-bold">One<span className="text-red-500">Med</span></span>
                  </div>

                  {/* Title */}
                  <p className="text-white font-bold text-lg leading-tight">
                    {currentTitle || <span className="text-muted-foreground italic">Título do email</span>}
                  </p>

                  {/* Coupon box */}
                  {currentCoupon && (
                    <div className="border-2 border-dashed border-green-500/50 rounded-lg py-3 px-4 bg-green-500/10">
                      <p className="text-green-400 text-xs font-bold uppercase mb-1">Cupom Exclusivo</p>
                      <p className="text-white text-xl font-bold tracking-widest">{currentCoupon}</p>
                      <p className="text-green-400 font-bold text-sm">{currentDiscount}% DE DESCONTO</p>
                    </div>
                  )}

                  {/* Subject line */}
                  <p className="text-slate-500 text-xs">
                    Assunto: <span className="text-slate-400">{currentSubject || '—'}</span>
                  </p>

                  {/* CTA mock */}
                  <div className="inline-block bg-red-600 text-white rounded-lg px-5 py-2 text-sm font-bold">
                    {templateType === 'custom' ? 'Acessar OneMed' : 'Usar Cupom e Garantir Acesso'}
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
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'trials', label: 'Trials', icon: Clock },
                    { id: 'buyers', label: 'Compradores', icon: DollarSign },
                    { id: 'both', label: 'Ambos', icon: Users },
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

                {recipients.length > 0 && (
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                    {recipients.slice(0, 5).map(e => (
                      <p key={e} className="text-xs text-muted-foreground truncate px-1">{e}</p>
                    ))}
                    {recipients.length > 5 && (
                      <p className="text-xs text-muted-foreground px-1">... e mais {recipients.length - 5}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Send */}
            <Card className="bg-background-paper border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" />
                  Envio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Delay note */}
                <p className="text-xs text-muted-foreground">
                  Delay aleatório de 1–5 segundos entre cada email para evitar bloqueio por spam.
                </p>

                {/* Progress bar */}
                {(sending || done) && progress.total > 0 && (
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

                {/* Action buttons */}
                <div className="flex gap-2">
                  {!sending ? (
                    <Button
                      onClick={startSending}
                      disabled={loadingRecipients || recipients.length === 0 || sending}
                      className="flex-1"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar para {recipients.length} email{recipients.length !== 1 ? 's' : ''}
                    </Button>
                  ) : (
                    <Button variant="destructive" onClick={stopSending} className="flex-1">
                      <StopCircle className="w-4 h-4 mr-2" />
                      Interromper envio
                    </Button>
                  )}
                </div>

                {/* Send log */}
                {log.length > 0 && (
                  <div className="max-h-52 overflow-y-auto space-y-1 border border-border rounded-lg p-2 bg-background">
                    {log.map((entry, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 px-1">
                        {entry.status === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        )}
                        <span className="text-xs text-foreground truncate flex-1">{entry.email}</span>
                        {entry.error && (
                          <span className="text-xs text-red-400 truncate max-w-24" title={entry.error}>
                            {entry.error}
                          </span>
                        )}
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                )}

                {done && !sending && (
                  <p className="text-xs text-center text-muted-foreground">
                    Campanha finalizada — {progress.sent} enviados com sucesso, {progress.failed} com erro.
                  </p>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

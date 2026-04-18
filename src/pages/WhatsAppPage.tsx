import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  MessageSquare, Users, CheckCircle2, XCircle, Loader2, Send,
  AlertTriangle, Info, Clock, StopCircle, Trash2, RefreshCw,
  FileText, Eye, LayoutTemplate,
} from 'lucide-react';

const BATCH_SIZE = 12;

// ── Tipos ────────────────────────────────────────────────────────────────────

type Audience =
  | 'trial_expired_today' | 'trial_expired_yesterday' | 'trial_expired_3d'
  | 'trial_expired_5d' | 'trial_expired_7d' | 'trial_expired_all'
  | 'trial_active' | 'buyers_approved' | 'buyers_all' | 'all_with_whatsapp' | 'custom';

interface WaTemplate {
  name: string;
  status: string;
  category: string;
  language: string;
  components: WaComponent[];
}

interface WaComponent {
  type: string;
  text?: string;
  buttons?: { type: string; text: string; url?: string; phone_number?: string }[];
}

interface ProgressItem {
  phone: string;
  email?: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  APPROVED: { label: 'Ativo', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  PENDING:  { label: 'Em análise', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  REJECTED: { label: 'Rejeitado', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  PAUSED:   { label: 'Pausado', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  DISABLED: { label: 'Desativado', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

const CATEGORY_MAP: Record<string, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação',
};

function getBodyComponent(t: WaTemplate): WaComponent | undefined {
  return t.components.find(c => c.type === 'BODY');
}

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\d+)\}\}/g) || [];
  const nums = [...new Set(matches.map(m => parseInt(m.replace(/\D/g, ''))))].sort((a, b) => a - b);
  return nums.map(n => `{{${n}}}`);
}

function fillVariables(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{(\d+)\}\}/g, (match, n) => values[`{{${n}}}`] || match);
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
      { value: 'all_with_whatsapp' as Audience, label: 'Todos com WhatsApp',    description: 'Trials + compradores com número cadastrado' },
      { value: 'custom'            as Audience, label: 'Lista avulsa',          description: 'Cole uma lista de números manualmente' },
    ],
  },
];

// ── Componente principal ──────────────────────────────────────────────────────

export default function WhatsAppPage() {
  // Templates
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Modo: 'template' | 'freetext'
  const [sendMode, setSendMode] = useState<'template' | 'freetext'>('template');

  // Template selecionado
  const [selectedTemplate, setSelectedTemplate] = useState<WaTemplate | null>(null);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});

  // Texto livre
  const [message, setMessage] = useState('');

  // Público
  const [audience, setAudience] = useState<Audience>('trial_expired_today');
  const [customNumbers, setCustomNumbers] = useState('');
  const [recipients, setRecipients] = useState<{ phone: string; email?: string }[]>([]);
  const [previewing, setPreviewing] = useState(false);

  // Envio
  const [delayMs, setDelayMs] = useState(1500);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [done, setDone] = useState(false);
  const stopRef = useRef(false);

  useEffect(() => { loadTemplates(); }, []);

  // ── API helper ──────────────────────────────────────────────────────────────
  async function callFn(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('send-whatsapp', { body });
    if (error) throw new Error(error.message || 'Erro na função');
    if (data?.error) throw new Error(data.error);
    return data;
  }

  // ── Carregar templates ──────────────────────────────────────────────────────
  async function loadTemplates() {
    setLoadingTemplates(true);
    try {
      const data = await callFn({ mode: 'list-templates' });
      setTemplates(data.templates || []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar templates');
    } finally {
      setLoadingTemplates(false);
    }
  }

  function handleSelectTemplate(t: WaTemplate) {
    setSelectedTemplate(t);
    const body = getBodyComponent(t);
    const vars = body?.text ? extractVariables(body.text) : [];
    const init: Record<string, string> = {};
    vars.forEach(v => { init[v] = ''; });
    setTemplateVars(init);
    resetSendState();
  }

  // ── Preview ─────────────────────────────────────────────────────────────────
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

  // ── Enviar ──────────────────────────────────────────────────────────────────
  async function handleSend() {
    if (sendMode === 'template' && !selectedTemplate) {
      toast.error('Selecione um template aprovado'); return;
    }
    if (sendMode === 'template' && selectedTemplate?.status !== 'APPROVED') {
      toast.error('Este template ainda não foi aprovado pela Meta'); return;
    }
    if (sendMode === 'freetext' && !message.trim()) {
      toast.error('Digite a mensagem antes de enviar'); return;
    }
    if (audience === 'custom' && !customNumbers.trim()) {
      toast.error('Adicione pelo menos um número'); return;
    }

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

        const batchPayload: Record<string, unknown> = {
          mode: 'batch',
          audience,
          delay_ms: delayMs,
          batch_recipients: batch,
        };

        if (sendMode === 'template' && selectedTemplate) {
          const vars = Object.values(templateVars).filter(Boolean);
          batchPayload.template_name = selectedTemplate.name;
          batchPayload.template_language = selectedTemplate.language;
          batchPayload.template_variables = vars;
        } else {
          batchPayload.message = message.trim();
        }

        let batchData: any = null;
        try { batchData = await callFn(batchPayload); } catch { /* mark as failed below */ }

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
      toast.success(`Disparo concluído: ${totalSent} enviadas, ${totalFailed} falhas`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setSending(false);
    }
  }

  function handleStop() { stopRef.current = true; toast.info('Parando após o lote atual...'); }

  async function handleClearHistory() {
    const { error } = await supabase.from('whatsapp_sends').delete().neq('id', '00000000-0000-0000-0000-000000000000');
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

  const approvedTemplates = templates.filter(t => t.status === 'APPROVED');
  const bodyText = selectedTemplate ? getBodyComponent(selectedTemplate)?.text || '' : '';
  const templateVarKeys = Object.keys(templateVars);
  const previewText = fillVariables(bodyText, templateVars);

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-green-500" />
              Disparos WhatsApp
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              API Oficial WhatsApp Business · Remetente: <span className="text-foreground font-mono">+55 63 9953-5519</span>
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

        {/* Boas práticas */}
        <div className="flex gap-3 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            <span className="text-yellow-400 font-medium">Boas práticas: </span>
            Envie entre <strong className="text-foreground">8h–20h</strong> · Limite de <strong className="text-foreground">1.000 msg/dia</strong> no tier inicial ·
            Para cold outreach (trials expirados) use sempre um <strong className="text-foreground">template aprovado</strong>.
          </p>
        </div>

        {/* ── Seção: Templates ─────────────────────────────────────────────── */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
                Templates de mensagem
              </CardTitle>
              <Button variant="outline" size="sm" onClick={loadTemplates} disabled={loadingTemplates}
                className="border-border text-muted-foreground hover:text-foreground">
                {loadingTemplates
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <RefreshCw className="w-4 h-4" />}
                <span className="ml-2">{loadingTemplates ? 'Carregando...' : 'Atualizar'}</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {templates.length === 0 && !loadingTemplates && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum template encontrado na conta.</p>
            )}
            {loadingTemplates && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {templates.length > 0 && (
              <div className="space-y-2">
                {templates.map(t => {
                  const st = STATUS_MAP[t.status] || { label: t.status, className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
                  const body = getBodyComponent(t);
                  const isSelected = selectedTemplate?.name === t.name && selectedTemplate?.language === t.language;
                  const isApproved = t.status === 'APPROVED';
                  return (
                    <div
                      key={`${t.name}-${t.language}`}
                      onClick={() => isApproved ? handleSelectTemplate(t) : undefined}
                      className={`rounded-lg border p-3 transition-colors ${
                        isApproved ? 'cursor-pointer' : 'cursor-default opacity-60'
                      } ${
                        isSelected
                          ? 'bg-green-500/10 border-green-500/40'
                          : 'border-border hover:bg-secondary/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className={`font-mono text-sm font-medium ${isSelected ? 'text-green-400' : 'text-foreground'}`}>
                            {t.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {CATEGORY_MAP[t.category] || t.category}
                          </span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{t.language}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${st.className}`}>
                          {st.label}
                        </span>
                      </div>
                      {body?.text && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 ml-6">
                          {body.text}
                        </p>
                      )}
                      {!isApproved && (
                        <p className="text-xs text-yellow-500/80 mt-1 ml-6">
                          {t.status === 'PENDING' ? 'Aguardando aprovação da Meta para ser usado' : 'Template indisponível para envio'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Seção: Mensagem ──────────────────────────────────────────────── */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">1. Mensagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle modo */}
            <div className="flex gap-2">
              {[
                { key: 'template' as const, label: 'Template aprovado', icon: LayoutTemplate },
                { key: 'freetext' as const, label: 'Texto livre (24h)', icon: MessageSquare },
              ].map(opt => {
                const Icon = opt.icon;
                return (
                  <button key={opt.key} onClick={() => { setSendMode(opt.key); resetSendState(); }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      sendMode === opt.key
                        ? 'bg-green-500/15 border-green-500/40 text-green-400'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}>
                    <Icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Modo Template */}
            {sendMode === 'template' && (
              <div className="space-y-4">
                {!selectedTemplate ? (
                  <div className="flex gap-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
                    <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Selecione um template <span className="text-green-400 font-medium">Ativo</span> na lista acima para continuar.
                      Apenas templates aprovados pela Meta podem ser enviados.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400 font-medium">{selectedTemplate.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{selectedTemplate.language}</span>
                    </div>

                    {/* Variáveis */}
                    {templateVarKeys.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Preencha as variáveis do template</Label>
                        {templateVarKeys.map(key => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded w-10 text-center flex-shrink-0">
                              {key}
                            </span>
                            <Input
                              value={templateVars[key]}
                              onChange={e => setTemplateVars(prev => ({ ...prev, [key]: e.target.value }))}
                              placeholder={`Valor para ${key}`}
                              className="bg-background border-border text-sm h-8"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Preview */}
                    {bodyText && (
                      <div>
                        <Label className="text-sm text-muted-foreground mb-1.5 block flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Preview
                        </Label>
                        <div className="bg-[#e5ddd5] rounded-lg p-4">
                          <div className="bg-white rounded-lg px-3 py-2 max-w-xs shadow-sm">
                            <p className="text-[13px] text-gray-800 whitespace-pre-wrap break-words leading-relaxed"
                              dangerouslySetInnerHTML={{
                                __html: previewText
                                  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
                                  .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
                                  .replace(/_(.*?)_/g, '<em>$1</em>')
                                  .replace(/\n/g, '<br/>'),
                              }}
                            />
                            {/* Botões do template */}
                            {selectedTemplate.components.filter(c => c.type === 'BUTTONS').map((c, i) => (
                              <div key={i} className="mt-2 border-t border-gray-100 pt-2 space-y-1">
                                {c.buttons?.map((btn, j) => (
                                  <div key={j} className="text-center text-[12px] text-blue-500 font-medium py-0.5">
                                    {btn.text}
                                  </div>
                                ))}
                              </div>
                            ))}
                            <p className="text-[10px] text-gray-400 text-right mt-1">00:00 ✓✓</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Modo Texto livre */}
            {sendMode === 'freetext' && (
              <div className="space-y-3">
                <div className="flex gap-3 p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    <span className="text-yellow-400 font-medium">Atenção: </span>
                    Texto livre só é entregue se o destinatário <strong className="text-foreground">mandou mensagem para o seu número nas últimas 24h</strong>.
                    Para trials e cold outreach, use <strong className="text-foreground">Template aprovado</strong>.
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-sm text-muted-foreground">Texto da mensagem <span className="text-red-400">*</span></Label>
                    <span className={`text-xs ${message.length > 1000 ? 'text-yellow-400' : 'text-muted-foreground'}`}>{message.length} caracteres</span>
                  </div>
                  <Textarea
                    value={message}
                    onChange={e => { setMessage(e.target.value); resetSendState(); }}
                    placeholder={`Digite sua mensagem aqui...\n\nUse *asteriscos* para negrito, _sublinhado_ para itálico e emojis à vontade 🎓`}
                    rows={8}
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Seção: Público-alvo ──────────────────────────────────────────── */}
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
                            ? 'bg-green-500/15 border-green-500/40'
                            : 'border-border hover:bg-secondary'
                        }`}>
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
                <span className="text-sm text-green-400 font-medium">
                  {recipients.length} destinatário{recipients.length !== 1 ? 's' : ''} com WhatsApp cadastrado
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Seção: Configurações e Envio ─────────────────────────────────── */}
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
                  <button key={opt.value} onClick={() => setDelayMs(opt.value)} disabled={sending}
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
                Não feche esta página durante o envio. O resultado de cada mensagem é registrado e aparece
                como indicador verde/vermelho em <strong className="text-foreground">Usuários Trial</strong>.
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button onClick={handleSend}
                disabled={sending || (sendMode === 'template' && (!selectedTemplate || selectedTemplate.status !== 'APPROVED')) || (sendMode === 'freetext' && !message.trim())}
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

        {/* ── Painel de progresso ──────────────────────────────────────────── */}
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
                  <span className="text-muted-foreground">{doneCount}/{totalProgress}</span>
                </div>
              </div>
              <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-300 rounded-full" style={{ width: `${progressPct}%` }} />
              </div>
              {done && <p className="text-xs text-green-400 mt-1 font-medium">✓ Disparo concluído — {sentCount} enviadas, {failedCount} falhas</p>}
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

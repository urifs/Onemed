import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageSquare, Users, DollarSign, CheckCircle2, XCircle,
  Loader2, Send, Plus, Trash2, Eye, AlertTriangle, Info,
  UserCheck, PhoneCall,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Audience = 'trial_expired' | 'trial_active' | 'buyers_approved' | 'buyers_all' | 'all_with_whatsapp' | 'custom';

interface Preset {
  label: string;
  templateName: string;
  language: string;
  variables: string[];
  description: string;
}

// ─── Presets de campanha ───────────────────────────────────────────────────────
// ATENÇÃO: os template_name abaixo devem corresponder exatamente aos templates
// aprovados no Meta Business Manager → WhatsApp → Modelos de mensagem
const PRESETS: Record<string, Preset> = {
  followup_1d: {
    label: 'Follow-up 1 dia',
    templateName: 'onemed_followup_1d',
    language: 'pt_BR',
    variables: ['ONEMED10'],
    description: 'Enviado 1 dia após o trial expirar. Variável 1: cupom de desconto.',
  },
  followup_7d: {
    label: 'Follow-up 7 dias',
    templateName: 'onemed_followup_7d',
    language: 'pt_BR',
    variables: ['ONEMED20'],
    description: 'Enviado 7 dias após o trial expirar. Variável 1: cupom de desconto.',
  },
  followup_30d: {
    label: 'Follow-up 30 dias',
    templateName: 'onemed_followup_30d',
    language: 'pt_BR',
    variables: ['ONEMED30'],
    description: 'Enviado 30 dias após o trial expirar. Variável 1: cupom de desconto.',
  },
  boas_vindas: {
    label: 'Boas-vindas trial',
    templateName: 'onemed_boas_vindas',
    language: 'pt_BR',
    variables: [],
    description: 'Confirmação de acesso ao trial gratuito.',
  },
  custom: {
    label: 'Personalizado',
    templateName: '',
    language: 'pt_BR',
    variables: [],
    description: 'Digite o nome do template e as variáveis manualmente.',
  },
};

const AUDIENCE_OPTIONS: { value: Audience; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'trial_expired', label: 'Trials expirados', icon: UserCheck },
  { value: 'trial_active', label: 'Trials ativos', icon: UserCheck },
  { value: 'buyers_approved', label: 'Compradores aprovados', icon: DollarSign },
  { value: 'buyers_all', label: 'Todos compradores', icon: DollarSign },
  { value: 'all_with_whatsapp', label: 'Todos com WhatsApp', icon: Users },
  { value: 'custom', label: 'Lista avulsa', icon: PhoneCall },
];

// ─── Componente principal ──────────────────────────────────────────────────────
export default function WhatsAppPage() {
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');
  const [templateName, setTemplateName] = useState('');
  const [templateLanguage, setTemplateLanguage] = useState('pt_BR');
  const [headerVariable, setHeaderVariable] = useState('');
  const [bodyVariables, setBodyVariables] = useState<string[]>(['']);
  const [audience, setAudience] = useState<Audience>('trial_expired');
  const [customNumbers, setCustomNumbers] = useState('');

  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent: number; failed: number; total: number; invalid: number; errors: string[];
  } | null>(null);

  // ── Selecionar preset ────────────────────────────────────────────────────────
  function applyPreset(key: string) {
    setSelectedPreset(key);
    const p = PRESETS[key];
    setTemplateName(p.templateName);
    setTemplateLanguage(p.language);
    setBodyVariables(p.variables.length > 0 ? [...p.variables] : ['']);
    setHeaderVariable('');
    setResult(null);
    setPreviewCount(null);
  }

  // ── Gerenciar variáveis ──────────────────────────────────────────────────────
  function setVar(index: number, value: string) {
    setBodyVariables(prev => prev.map((v, i) => (i === index ? value : v)));
  }
  function addVar() {
    if (bodyVariables.length >= 10) return;
    setBodyVariables(prev => [...prev, '']);
  }
  function removeVar(index: number) {
    setBodyVariables(prev => prev.filter((_, i) => i !== index));
  }

  // ── Pré-visualizar destinatários ─────────────────────────────────────────────
  async function handlePreview() {
    setPreviewing(true);
    setPreviewCount(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Sessão expirada'); return; }

      const payload: Record<string, unknown> = { audience };
      if (audience === 'custom') {
        payload.custom_numbers = customNumbers.split('\n').map(s => s.trim()).filter(Boolean);
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ ...payload, audience: 'preview' }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao buscar destinatários');
      setPreviewCount(data.total ?? 0);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setPreviewing(false);
    }
  }

  // ── Enviar campanha ──────────────────────────────────────────────────────────
  async function handleSend() {
    if (!templateName.trim()) {
      toast.error('Informe o nome do template');
      return;
    }

    const vars = bodyVariables.map(v => v.trim()).filter(Boolean);

    setSending(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Sessão expirada'); return; }

      const payload: Record<string, unknown> = {
        audience,
        template_name: templateName.trim(),
        template_language: templateLanguage.trim() || 'pt_BR',
        body_variables: vars,
      };
      if (headerVariable.trim()) payload.header_variable = headerVariable.trim();
      if (audience === 'custom') {
        payload.custom_numbers = customNumbers.split('\n').map(s => s.trim()).filter(Boolean);
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar');

      setResult({
        sent: data.sent ?? 0,
        failed: data.failed ?? 0,
        total: data.total ?? 0,
        invalid: data.invalid ?? 0,
        errors: data.errors ?? [],
      });
      toast.success(`Campanha concluída: ${data.sent} enviadas`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setSending(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-green-500" />
            Disparos WhatsApp
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Envie mensagens em massa via WhatsApp Business API (Meta Cloud API)
          </p>
        </div>

        {/* Aviso sobre templates */}
        <div className="flex gap-3 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-yellow-400 font-medium">Templates precisam estar aprovados pela Meta</p>
            <p className="text-muted-foreground mt-1">
              Crie e aguarde aprovação em{' '}
              <span className="text-foreground font-mono text-xs bg-secondary px-1 py-0.5 rounded">
                Meta Business Manager → WhatsApp → Modelos de mensagem
              </span>{' '}
              antes de usar aqui. Templates não aprovados retornarão erro.
            </p>
          </div>
        </div>

        {/* Seção 1 — Template */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-foreground">1. Template da Mensagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Presets */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Preset rápido</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PRESETS).map(([key, p]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      selectedPreset === key
                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {selectedPreset !== 'custom' && (
                <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  {PRESETS[selectedPreset].description}
                </p>
              )}
            </div>

            {/* Nome do template */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">
                  Nome do template <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={templateName}
                  onChange={e => { setTemplateName(e.target.value); setSelectedPreset('custom'); }}
                  placeholder="ex: onemed_followup_1d"
                  className="bg-background border-border font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">Exatamente como aparece no Meta</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">Idioma</Label>
                <Input
                  value={templateLanguage}
                  onChange={e => setTemplateLanguage(e.target.value)}
                  placeholder="pt_BR"
                  className="bg-background border-border font-mono text-sm"
                />
              </div>
            </div>

            {/* Variável do cabeçalho (opcional) */}
            <div>
              <Label className="text-sm text-muted-foreground mb-1.5 block">
                Variável do cabeçalho (header) — opcional
              </Label>
              <Input
                value={headerVariable}
                onChange={e => setHeaderVariable(e.target.value)}
                placeholder="ex: OneMed Cursos"
                className="bg-background border-border text-sm"
              />
            </div>

            {/* Variáveis do corpo */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm text-muted-foreground">Variáveis do corpo &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125;...</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addVar}
                  disabled={bodyVariables.length >= 10}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {bodyVariables.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 flex-shrink-0 font-mono">
                      {`{{${i + 1}}}`}
                    </span>
                    <Input
                      value={v}
                      onChange={e => setVar(i, e.target.value)}
                      placeholder={`Valor da variável ${i + 1}`}
                      className="bg-background border-border text-sm flex-1"
                    />
                    {bodyVariables.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVar(i)}
                        className="h-8 w-8 text-muted-foreground hover:text-red-400 flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Deixe em branco se o template não tiver variáveis no corpo.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Seção 2 — Público-alvo */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-foreground">2. Público-alvo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AUDIENCE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => { setAudience(opt.value); setPreviewCount(null); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                      audience === opt.value
                        ? 'bg-green-500/15 border-green-500/40 text-green-400'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Lista avulsa */}
            {audience === 'custom' && (
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">
                  Números de telefone (um por linha)
                </Label>
                <Textarea
                  value={customNumbers}
                  onChange={e => { setCustomNumbers(e.target.value); setPreviewCount(null); }}
                  placeholder={`5563999849659\n5511987654321\n+55 41 98765-4321`}
                  rows={6}
                  className="bg-background border-border font-mono text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Aceita vários formatos: com/sem +55, com/sem traços, com/sem espaços.
                </p>
              </div>
            )}

            {/* Botão de preview */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={previewing || (audience === 'custom' && !customNumbers.trim())}
                className="border-border text-muted-foreground hover:text-foreground"
              >
                {previewing
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <Eye className="w-4 h-4 mr-2" />}
                Ver quantos serão impactados
              </Button>
              {previewCount !== null && (
                <span className="text-sm text-green-400 font-medium">
                  {previewCount} destinatário{previewCount !== 1 ? 's' : ''} com WhatsApp cadastrado
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Seção 3 — Enviar */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-foreground">3. Enviar Campanha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
              <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                O envio é feito em sequência com intervalo de 100ms entre mensagens.
                Para audiências grandes (500+ números), o processo pode levar alguns minutos.
                Não feche a página enquanto o envio estiver em andamento.
              </p>
            </div>

            <Button
              onClick={handleSend}
              disabled={sending || !templateName.trim()}
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              size="lg"
            >
              {sending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                : <><Send className="w-4 h-4 mr-2" /> Disparar mensagens</>}
            </Button>

            {/* Resultado */}
            {result && (
              <div className="mt-4 rounded-lg border border-border p-4 space-y-3">
                <h3 className="text-sm font-medium text-foreground">Resultado do disparo</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-center">
                    <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-green-400">{result.sent}</p>
                    <p className="text-xs text-muted-foreground">Enviadas</p>
                  </div>
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
                    <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-red-400">{result.failed}</p>
                    <p className="text-xs text-muted-foreground">Falharam</p>
                  </div>
                  <div className="rounded-lg bg-secondary border border-border p-3 text-center">
                    <Users className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xl font-bold text-foreground">{result.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-yellow-400">{result.invalid}</p>
                    <p className="text-xs text-muted-foreground">Inválidos</p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-400 mb-2">
                      Erros ({result.errors.length}):
                    </p>
                    <div className="max-h-40 overflow-y-auto rounded bg-background border border-border p-2 space-y-1">
                      {result.errors.map((err, i) => (
                        <p key={i} className="text-xs font-mono text-red-300">{err}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

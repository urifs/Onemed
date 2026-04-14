import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageSquare, Users, DollarSign, CheckCircle2, XCircle,
  Loader2, Send, Eye, AlertTriangle, Info, UserCheck, PhoneCall,
  Clock,
} from 'lucide-react';

// ─── Tipos de audiência ────────────────────────────────────────────────────────
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
      { value: 'trial_expired_today',     label: 'Hoje',             description: 'Expiraram hoje' },
      { value: 'trial_expired_yesterday', label: 'Ontem',            description: 'Expiraram ontem' },
      { value: 'trial_expired_3d',        label: 'Últimos 3 dias',   description: 'Expiraram nos últimos 3 dias' },
      { value: 'trial_expired_5d',        label: 'Últimos 5 dias',   description: 'Expiraram nos últimos 5 dias' },
      { value: 'trial_expired_7d',        label: 'Últimos 7 dias',   description: 'Expiraram nos últimos 7 dias' },
      { value: 'trial_expired_all',       label: 'Todos os expirados', description: 'Todos os trials já expirados' },
    ],
  },
  {
    label: 'Outros',
    icon: Users,
    options: [
      { value: 'trial_active',      label: 'Trials ativos',          description: 'Usuários com trial em andamento' },
      { value: 'buyers_approved',   label: 'Compradores aprovados',  description: 'Quem já pagou e teve acesso liberado' },
      { value: 'buyers_all',        label: 'Todos compradores',      description: 'Todos os registros na tabela de compradores' },
      { value: 'all_with_whatsapp', label: 'Todos com WhatsApp',     description: 'Trials + compradores com número cadastrado' },
      { value: 'custom',            label: 'Lista avulsa',           description: 'Cole uma lista de números manualmente' },
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

export default function WhatsAppPage() {
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<Audience>('trial_expired_today');
  const [customNumbers, setCustomNumbers] = useState('');
  const [delayMs, setDelayMs] = useState(1500);

  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent: number; failed: number; total: number; invalid: number; errors: string[];
  } | null>(null);

  // ── Preview ────────────────────────────────────────────────────────────────
  async function handlePreview() {
    setPreviewing(true);
    setPreviewCount(null);
    try {
      const payload: Record<string, unknown> = {
        audience: 'preview',
        message: audience,
      };
      if (audience === 'custom') {
        payload.custom_numbers = customNumbers.split('\n').map(s => s.trim()).filter(Boolean);
        payload.message = 'custom';
      }

      const { data, error } = await supabase.functions.invoke('send-whatsapp', { body: payload });
      if (error) throw new Error(error.message || 'Erro ao buscar contagem');
      setPreviewCount(data?.total ?? 0);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao buscar contagem');
    } finally {
      setPreviewing(false);
    }
  }

  // ── Enviar ─────────────────────────────────────────────────────────────────
  async function handleSend() {
    if (!message.trim()) { toast.error('Digite a mensagem antes de enviar'); return; }
    if (audience === 'custom' && !customNumbers.trim()) { toast.error('Adicione pelo menos um número'); return; }

    setSending(true);
    setResult(null);
    try {
      const payload: Record<string, unknown> = { audience, message: message.trim(), delay_ms: delayMs };
      if (audience === 'custom') {
        payload.custom_numbers = customNumbers.split('\n').map(s => s.trim()).filter(Boolean);
      }

      const { data, error } = await supabase.functions.invoke('send-whatsapp', { body: payload });
      if (error) throw new Error(error.message || 'Erro ao enviar');

      setResult({ sent: data?.sent ?? 0, failed: data?.failed ?? 0, total: data?.total ?? 0, invalid: data?.invalid ?? 0, errors: data?.errors ?? [] });
      toast.success(`Disparo concluído: ${data?.sent ?? 0} mensagens enviadas`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setSending(false);
    }
  }

  const selectedOption = AUDIENCE_GROUPS.flatMap(g => g.options).find(o => o.value === audience);

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-green-500" />
            Disparos WhatsApp
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Envie mensagens em massa via Z-API · Número: <span className="text-foreground font-mono">+55 (45) 99122-0048</span>
          </p>
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
                  <button key={qm.label} onClick={() => { setMessage(qm.text); setResult(null); }}
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
                onChange={e => { setMessage(e.target.value); setResult(null); }}
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
                        onClick={() => { setAudience(opt.value); setPreviewCount(null); setResult(null); }}
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
                  onChange={e => { setCustomNumbers(e.target.value); setPreviewCount(null); }}
                  placeholder={`5563999849659\n5511987654321\n+55 41 98765-4321`}
                  rows={5}
                  className="bg-background border-border font-mono text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">Aceita qualquer formato: com/sem +55, traços ou espaços.</p>
              </div>
            )}

            {/* Preview count */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="outline" size="sm" onClick={handlePreview}
                disabled={previewing || (audience === 'custom' && !customNumbers.trim())}
                className="border-border text-muted-foreground hover:text-foreground">
                {previewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                Ver quantos serão impactados
              </Button>
              {previewCount !== null && (
                <span className="text-sm text-green-400 font-medium">
                  {previewCount} destinatário{previewCount !== 1 ? 's' : ''} com WhatsApp cadastrado
                  {selectedOption && <span className="text-muted-foreground font-normal"> · {selectedOption.label}</span>}
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      delayMs === opt.value
                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {previewCount !== null && previewCount > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Tempo estimado: ~{Math.ceil((previewCount * delayMs) / 60000)} minuto{Math.ceil((previewCount * delayMs) / 60000) !== 1 ? 's' : ''} para {previewCount} mensagens
                </p>
              )}
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
              <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Não feche esta página durante o envio. O resultado de cada disparo é registrado automaticamente
                e aparece como indicador verde/vermelho na página de <strong className="text-foreground">Usuários Trial</strong>.
              </p>
            </div>

            <Button onClick={handleSend} disabled={sending || !message.trim()}
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto" size="lg">
              {sending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando... não feche a página</>
                : <><Send className="w-4 h-4 mr-2" />Disparar mensagens</>}
            </Button>

            {result && (
              <div className="rounded-lg border border-border p-4 space-y-3">
                <h3 className="text-sm font-medium text-foreground">Resultado do disparo</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Enviadas', value: result.sent, icon: CheckCircle2, color: 'green' },
                    { label: 'Falharam', value: result.failed, icon: XCircle, color: 'red' },
                    { label: 'Total', value: result.total, icon: Users, color: 'gray' },
                    { label: 'Inválidos', value: result.invalid, icon: AlertTriangle, color: 'yellow' },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className={`rounded-lg p-3 text-center border ${
                      color === 'green' ? 'bg-green-500/10 border-green-500/20' :
                      color === 'red' ? 'bg-red-500/10 border-red-500/20' :
                      color === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/20' :
                      'bg-secondary border-border'
                    }`}>
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${
                        color === 'green' ? 'text-green-400' : color === 'red' ? 'text-red-400' :
                        color === 'yellow' ? 'text-yellow-400' : 'text-muted-foreground'
                      }`} />
                      <p className={`text-2xl font-bold ${
                        color === 'green' ? 'text-green-400' : color === 'red' ? 'text-red-400' :
                        color === 'yellow' ? 'text-yellow-400' : 'text-foreground'
                      }`}>{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                {result.errors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-400 mb-2">Erros ({result.errors.length}):</p>
                    <div className="max-h-40 overflow-y-auto rounded bg-background border border-border p-2 space-y-1">
                      {result.errors.map((err, i) => <p key={i} className="text-xs font-mono text-red-300">{err}</p>)}
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

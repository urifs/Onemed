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
  Bold, Italic,
} from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

type Audience = 'trial_expired' | 'trial_active' | 'buyers_approved' | 'buyers_all' | 'all_with_whatsapp' | 'custom';

const AUDIENCE_OPTIONS: {
  value: Audience;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: 'trial_expired', label: 'Trials expirados', description: 'Usuários que fizeram trial e não compraram', icon: UserCheck },
  { value: 'trial_active', label: 'Trials ativos', description: 'Usuários com trial em andamento agora', icon: UserCheck },
  { value: 'buyers_approved', label: 'Compradores aprovados', description: 'Quem já pagou e teve acesso liberado', icon: DollarSign },
  { value: 'buyers_all', label: 'Todos compradores', description: 'Todos os registros na tabela de compradores', icon: DollarSign },
  { value: 'all_with_whatsapp', label: 'Todos com WhatsApp', description: 'Trials + compradores com número cadastrado', icon: Users },
  { value: 'custom', label: 'Lista avulsa', description: 'Cole uma lista de números manualmente', icon: PhoneCall },
];

const MESSAGE_TIPS = [
  { symbol: '*texto*', result: 'negrito' },
  { symbol: '_texto_', result: 'itálico' },
  { symbol: '~texto~', result: 'tachado' },
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
  const [audience, setAudience] = useState<Audience>('trial_expired');
  const [customNumbers, setCustomNumbers] = useState('');
  const [delayMs, setDelayMs] = useState(1500);

  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent: number; failed: number; total: number; invalid: number; errors: string[];
  } | null>(null);

  const charCount = message.length;

  // ── Preview ────────────────────────────────────────────────────────────────
  async function handlePreview() {
    setPreviewing(true);
    setPreviewCount(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Sessão expirada'); return; }

      const payload: Record<string, unknown> = {
        audience: 'preview',
        message: audience, // reaproveitado para passar o audience real
      };
      if (audience === 'custom') {
        payload.custom_numbers = customNumbers.split('\n').map(s => s.trim()).filter(Boolean);
        payload.message = 'custom';
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro');
      setPreviewCount(data.total ?? 0);
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Sessão expirada'); return; }

      const payload: Record<string, unknown> = { audience, message: message.trim(), delay_ms: delayMs };
      if (audience === 'custom') {
        payload.custom_numbers = customNumbers.split('\n').map(s => s.trim()).filter(Boolean);
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar');

      setResult({ sent: data.sent ?? 0, failed: data.failed ?? 0, total: data.total ?? 0, invalid: data.invalid ?? 0, errors: data.errors ?? [] });
      toast.success(`Disparo concluído: ${data.sent} mensagens enviadas`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setSending(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
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

        {/* Aviso de boas práticas */}
        <div className="flex gap-3 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="text-yellow-400 font-medium">Boas práticas para evitar ban</p>
            <p className="text-muted-foreground">
              Envie entre <strong className="text-foreground">8h e 20h</strong> · Máximo <strong className="text-foreground">300-500 por dia</strong> ·
              Personalize a mensagem com o nome quando possível · Evite repetir a mesma mensagem dias seguidos para o mesmo público.
            </p>
          </div>
        </div>

        {/* Seção 1 — Mensagem */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-foreground">1. Mensagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Mensagens rápidas */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Mensagens prontas</Label>
              <div className="flex flex-wrap gap-2">
                {QUICK_MESSAGES.map(qm => (
                  <button
                    key={qm.label}
                    onClick={() => { setMessage(qm.text); setResult(null); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    {qm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea da mensagem */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-sm text-muted-foreground">
                  Texto da mensagem <span className="text-red-400">*</span>
                </Label>
                <span className={`text-xs ${charCount > 1000 ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                  {charCount} caracteres
                </span>
              </div>
              <Textarea
                value={message}
                onChange={e => { setMessage(e.target.value); setResult(null); }}
                placeholder="Digite sua mensagem aqui...

Use *asteriscos* para negrito, _sublinhado_ para itálico e emojis à vontade 🎓"
                rows={10}
                className="bg-background border-border text-sm resize-none font-mono"
              />
              {/* Dicas de formatação */}
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="w-3 h-3" /> Formatação WhatsApp:
                </span>
                {MESSAGE_TIPS.map(tip => (
                  <span key={tip.symbol} className="text-xs text-muted-foreground">
                    <span className="font-mono text-foreground">{tip.symbol}</span> → {tip.result}
                  </span>
                ))}
              </div>
            </div>

            {/* Preview da mensagem formatada */}
            {message.trim() && (
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">Preview</Label>
                <div className="bg-[#e5ddd5] rounded-lg p-4">
                  <div className="bg-white rounded-lg px-3 py-2 max-w-xs shadow-sm">
                    <p
                      className="text-[13px] text-gray-800 whitespace-pre-wrap break-words leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: message
                          .replace(/&/g, '&amp;')
                          .replace(/</g, '&lt;')
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
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AUDIENCE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => { setAudience(opt.value); setPreviewCount(null); setResult(null); }}
                    className={`flex items-start gap-3 px-3 py-3 rounded-lg border text-left transition-colors ${
                      audience === opt.value
                        ? 'bg-green-500/15 border-green-500/40'
                        : 'border-border hover:bg-secondary'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${audience === opt.value ? 'text-green-400' : 'text-muted-foreground'}`} />
                    <div>
                      <p className={`text-sm font-medium ${audience === opt.value ? 'text-green-400' : 'text-foreground'}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                    </div>
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
                  rows={5}
                  className="bg-background border-border font-mono text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Aceita vários formatos: com/sem +55, com/sem traços ou espaços.
                </p>
              </div>
            )}

            {/* Botão preview */}
            <div className="flex items-center gap-3 flex-wrap">
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

        {/* Seção 3 — Configurações e envio */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-foreground">3. Configurações e Envio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Delay */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                Intervalo entre mensagens
              </Label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: '1s (rápido)', value: 1000 },
                  { label: '1,5s (recomendado)', value: 1500 },
                  { label: '2s (seguro)', value: 2000 },
                  { label: '3s (muito seguro)', value: 3000 },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDelayMs(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      delayMs === opt.value
                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {previewCount !== null && previewCount > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Tempo estimado: ~{Math.ceil((previewCount * delayMs) / 60000)} minutos para {previewCount} mensagens
                </p>
              )}
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
              <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Não feche esta página durante o envio. Para audiências grandes (acima de 150 mensagens),
                o processo pode levar alguns minutos dependendo do intervalo configurado.
              </p>
            </div>

            <Button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              size="lg"
            >
              {sending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando... não feche a página</>
                : <><Send className="w-4 h-4 mr-2" />Disparar mensagens</>}
            </Button>

            {/* Resultado */}
            {result && (
              <div className="rounded-lg border border-border p-4 space-y-3">
                <h3 className="text-sm font-medium text-foreground">Resultado do disparo</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-center">
                    <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-400">{result.sent}</p>
                    <p className="text-xs text-muted-foreground">Enviadas</p>
                  </div>
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
                    <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-red-400">{result.failed}</p>
                    <p className="text-xs text-muted-foreground">Falharam</p>
                  </div>
                  <div className="rounded-lg bg-secondary border border-border p-3 text-center">
                    <Users className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                    <p className="text-2xl font-bold text-foreground">{result.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-yellow-400">{result.invalid}</p>
                    <p className="text-xs text-muted-foreground">Inválidos</p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-400 mb-2">Erros ({result.errors.length}):</p>
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

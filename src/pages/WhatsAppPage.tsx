import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MessageCircle,
  RefreshCw,
  Loader2,
  Save,
  Settings,
  QrCode,
  WifiOff,
  Phone,
  MessageSquare,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface WaConfig {
  id?: string;
  evolution_api_url?: string;
  evolution_api_key?: string;
  instance_name?: string;
  auto_reply_message?: string;
  trigger_keyword?: string;
  connected?: boolean;
  phone_number?: string;
}

interface WaMessage {
  id: string;
  phone_number: string | null;
  remote_jid: string;
  message_text: string | null;
  replied: boolean;
  reply_text: string | null;
  error: string | null;
  received_at: string;
}

type ConnStatus = 'not_configured' | 'disconnected' | 'connecting' | 'connected';

export default function WhatsAppPage() {
  const { session } = useAuth();

  // ID da linha de configuração (para updates)
  const [configId, setConfigId] = useState<string | null>(null);

  // Campos de configuração da API
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [instanceName, setInstanceName] = useState('onemed');
  const [savingConfig, setSavingConfig] = useState(false);

  // Estado da conexão
  const [status, setStatus] = useState<ConnStatus>('not_configured');
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Resposta automática
  const [triggerKeyword, setTriggerKeyword] = useState('Tenho interesse');
  const [autoReplyMessage, setAutoReplyMessage] = useState('');
  const [savingReply, setSavingReply] = useState(false);

  // Log de mensagens
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Flag: API já foi configurada com URL e chave
  const [isConfigured, setIsConfigured] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lê config direto do banco (sem Edge Function)
  const fetchConfig = async () => {
    const { data } = await supabase.from('whatsapp_config').select('*').maybeSingle();
    if (data) {
      const c = data as WaConfig & { id: string };
      setConfigId(c.id);
      setApiUrl(c.evolution_api_url || '');
      setApiKey(c.evolution_api_key || '');
      setInstanceName(c.instance_name || 'onemed');
      setTriggerKeyword(c.trigger_keyword || 'Tenho interesse');
      setAutoReplyMessage(c.auto_reply_message || '');
      setIsConfigured(!!(c.evolution_api_url && c.evolution_api_key));
    }
  };

  // Verifica status diretamente na Evolution API
  const fetchStatus = async (url = apiUrl, key = apiKey, inst = instanceName) => {
    if (!url.trim() || !key.trim()) { setStatus('not_configured'); return; }
    setStatusLoading(true);
    try {
      const base = url.replace(/\/$/, '');
      const name = inst.trim() || 'onemed';
      const stateRes = await fetch(`${base}/instance/connectionState/${name}`, {
        headers: { apikey: key },
      }).catch(() => null);

      if (!stateRes || !stateRes.ok) { setStatus('disconnected'); return; }
      const stateData = await stateRes.json().catch(() => ({}));
      const state: string = stateData.instance?.state || stateData.state || '';

      if (state === 'open') {
        setStatus('connected');
        try {
          const infoRes = await fetch(`${base}/instance/fetchInstances?instanceName=${name}`, { headers: { apikey: key } });
          if (infoRes.ok) {
            const raw = await infoRes.json().catch(() => []);
            const arr = Array.isArray(raw) ? raw : [raw];
            const found = arr.find((i: any) => i.instance?.instanceName === name || i.instanceName === name);
            setPhone(found?.instance?.owner?.replace('@s.whatsapp.net', '') || found?.owner?.replace('@s.whatsapp.net', '') || null);
          }
        } catch { /* best effort */ }
      } else {
        try {
          const qrRes = await fetch(`${base}/instance/connect/${name}`, { headers: { apikey: key } });
          if (qrRes.ok) {
            const qrData = await qrRes.json().catch(() => ({}));
            const qr = qrData.base64 || qrData.qrcode?.base64 || null;
            setQrcode(qr);
            setStatus(qr ? 'connecting' : 'disconnected');
          } else {
            setStatus('disconnected');
          }
        } catch { setStatus('disconnected'); }
      }
    } finally {
      setStatusLoading(false);
    }
  };

  // Lê mensagens direto do banco (sem Edge Function)
  const fetchMessages = async () => {
    setMessagesLoading(true);
    const { data } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(50);
    setMessagesLoading(false);
    if (data) setMessages(data as WaMessage[]);
  };

  useEffect(() => {
    fetchConfig().then(() => fetchMessages());
  }, []);

  // Busca status quando a config está pronta (passa valores atuais explicitamente)
  useEffect(() => {
    if (isConfigured) fetchStatus(apiUrl, apiKey, instanceName);
  }, [isConfigured]);

  // Polling a cada 30 segundos quando configurado
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (status === 'not_configured') return;

    intervalRef.current = setInterval(() => {
      fetchStatus(apiUrl, apiKey, instanceName);
      fetchMessages();
    }, 30_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status]);

  // Salva config API direto no banco
  const saveApiConfig = async () => {
    if (!apiUrl.trim() || !apiKey.trim()) {
      toast.error('Preencha a URL e a Chave da API');
      return;
    }
    setSavingConfig(true);
    const patch = {
      evolution_api_url: apiUrl.trim(),
      evolution_api_key: apiKey.trim(),
      instance_name: instanceName.trim() || 'onemed',
      updated_at: new Date().toISOString(),
    };
    let error;
    if (configId) {
      ({ error } = await supabase.from('whatsapp_config').update(patch).eq('id', configId));
    } else {
      const res = await supabase.from('whatsapp_config').insert(patch).select('id').single();
      error = res.error;
      if (!error && res.data) setConfigId(res.data.id);
    }
    setSavingConfig(false);
    if (error) { toast.error('Erro ao salvar configuração: ' + error.message); return; }
    toast.success('Configuração salva!');
    setIsConfigured(true);
    fetchStatus(apiUrl.trim(), apiKey.trim(), instanceName.trim() || 'onemed');
  };

  // Salva resposta automática direto no banco
  const saveAutoReply = async () => {
    if (!autoReplyMessage.trim()) {
      toast.error('Digite a mensagem de resposta automática');
      return;
    }
    setSavingReply(true);
    const patch = {
      trigger_keyword: triggerKeyword.trim() || 'Tenho interesse',
      auto_reply_message: autoReplyMessage.trim(),
      updated_at: new Date().toISOString(),
    };
    let error;
    if (configId) {
      ({ error } = await supabase.from('whatsapp_config').update(patch).eq('id', configId));
    } else {
      ({ error } = await supabase.from('whatsapp_config').insert(patch));
    }
    setSavingReply(false);
    if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
    toast.success('Resposta automática salva!');
  };

  const connectWhatsApp = async () => {
    if (!apiUrl.trim() || !apiKey.trim()) {
      toast.error('Configure a URL e a Chave da API primeiro');
      return;
    }
    setConnecting(true);
    try {
      const base = apiUrl.replace(/\/$/, '');
      const inst = instanceName.trim() || 'onemed';
      const webhookUrl = 'https://jrrybiohwqabsdurqudc.supabase.co/functions/v1/whatsapp-webhook';

      // Cria instância (403/409 = já existe, continua normalmente)
      const createRes = await fetch(`${base}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({
          instanceName: inst,
          integration: 'WHATSAPP-BAILEYS',
          qrcode: true,
          webhook: { url: webhookUrl, byEvents: true, base64: true, events: ['MESSAGES_UPSERT'] },
        }),
      }).catch(() => null);

      if (createRes && !createRes.ok && createRes.status !== 403 && createRes.status !== 409) {
        const err = await createRes.json().catch(() => ({}));
        const msg = (err as any)?.response?.message?.[0] || (err as any)?.message || `Erro ${createRes.status}`;
        throw new Error(msg);
      }

      // Obtém QR Code
      const qrRes = await fetch(`${base}/instance/connect/${inst}`, { headers: { apikey: apiKey } });
      if (!qrRes.ok) throw new Error(`Erro ${qrRes.status} ao obter QR Code`);
      const qrData = await qrRes.json().catch(() => ({}));
      const qr = qrData.base64 || qrData.qrcode?.base64 || null;

      if (qr) {
        setQrcode(qr);
        setStatus('connecting');
        toast.success('QR Code gerado! Escaneie com o WhatsApp Business.');
      } else {
        fetchStatus(apiUrl, apiKey, inst);
      }
    } catch (e: any) {
      toast.error('Erro ao conectar: ' + (e.message || 'Tente novamente'));
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWhatsApp = async () => {
    if (!confirm('Deseja desconectar o WhatsApp Business?')) return;
    setDisconnecting(true);
    try {
      const base = apiUrl.replace(/\/$/, '');
      const inst = instanceName.trim() || 'onemed';
      await fetch(`${base}/instance/logout/${inst}`, {
        method: 'DELETE',
        headers: { apikey: apiKey },
      }).catch(() => null);
      if (configId) {
        await supabase.from('whatsapp_config').update({ connected: false, phone_number: null }).eq('id', configId);
      }
      setStatus('disconnected');
      setQrcode(null);
      setPhone(null);
      toast.success('WhatsApp desconectado');
    } catch {
      toast.error('Erro ao desconectar');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div>
          <h1 className="font-secondary text-3xl font-bold text-foreground">WhatsApp Business</h1>
          <p className="text-muted-foreground mt-1">
            Conecte seu WhatsApp Business via QR Code e configure resposta automática para leads do tráfego pago
          </p>
        </div>

        {/* Instruções iniciais */}
        {!isConfigured && (
          <Card className="bg-background-paper border-primary/30 border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-primary flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuração Inicial — Evolution API
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="text-foreground font-medium">
                Para funcionar, você precisa de uma Evolution API rodando num servidor. É gratuito:
              </p>
              <ol className="space-y-2 list-decimal list-inside leading-relaxed">
                <li>
                  Acesse{' '}
                  <a
                    href="https://railway.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium hover:underline"
                  >
                    railway.app
                  </a>{' '}
                  e crie uma conta gratuita
                </li>
                <li>Clique no botão abaixo para fazer o deploy da Evolution API com 1 clique</li>
                <li>
                  Após o deploy, copie a URL gerada (ex:{' '}
                  <code className="text-xs bg-secondary px-1 py-0.5 rounded">
                    https://evolution-api-xxx.up.railway.app
                  </code>
                  )
                </li>
                <li>
                  No Railway, vá em <strong>Variables</strong> e adicione{' '}
                  <code className="text-xs bg-secondary px-1 py-0.5 rounded">
                    AUTHENTICATION_API_KEY
                  </code>{' '}
                  com uma senha de sua escolha
                </li>
                <li>Cole a URL e a senha (API Key) nos campos abaixo e salve</li>
              </ol>
              <div className="pt-1">
                <a
                  href="https://railway.app/new/template/evolution-api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Deploy Evolution API no Railway (gratuito)
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card: Configuração da API */}
        <Card className="bg-background-paper border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Configuração da Evolution API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                URL da Evolution API
              </label>
              <input
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                placeholder="https://evolution-api-xxx.up.railway.app"
                className="w-full h-10 rounded-md border border-border bg-secondary text-foreground px-3 text-sm placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Chave da API (AUTHENTICATION_API_KEY)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sua-chave-secreta"
                className="w-full h-10 rounded-md border border-border bg-secondary text-foreground px-3 text-sm placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Nome da instância
              </label>
              <input
                value={instanceName}
                onChange={e => setInstanceName(e.target.value)}
                placeholder="onemed"
                className="w-full h-10 rounded-md border border-border bg-secondary text-foreground px-3 text-sm placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Identificador interno da conexão (use somente letras minúsculas e hífens)
              </p>
            </div>
            <Button
              onClick={saveApiConfig}
              disabled={savingConfig}
              className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2"
            >
              {savingConfig ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar Configuração
            </Button>
          </CardContent>
        </Card>

        {/* Card: Conexão WhatsApp */}
        {isConfigured && (
          <Card className="bg-background-paper border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                Conexão WhatsApp Business
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Badge de status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {status === 'connected' && (
                    <>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-sm font-medium text-green-500 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Conectado
                      </span>
                      {phone && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1 ml-1">
                          <Phone className="w-3 h-3" /> +{phone}
                        </span>
                      )}
                    </>
                  )}
                  {status === 'connecting' && (
                    <>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />
                      <span className="text-sm font-medium text-yellow-500">
                        Aguardando escaneamento do QR Code...
                      </span>
                    </>
                  )}
                  {status === 'disconnected' && (
                    <>
                      <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" /> Desconectado
                      </span>
                    </>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchStatus(apiUrl, apiKey, instanceName)}
                  disabled={statusLoading}
                  className="text-muted-foreground hover:text-foreground gap-1"
                >
                  <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>

              {/* QR Code */}
              {status === 'connecting' && qrcode && (
                <div className="flex flex-col items-center gap-3 py-4 border border-border rounded-xl bg-secondary/30">
                  <p className="text-sm text-muted-foreground text-center px-4">
                    Abra o <strong>WhatsApp Business</strong> → <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong>
                  </p>
                  <div className="bg-white p-4 rounded-xl shadow-sm">
                    <img src={qrcode} alt="QR Code WhatsApp" className="w-52 h-52" />
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    QR Code expira em ~60s · atualiza automaticamente a cada 30s
                  </p>
                </div>
              )}

              {/* Conectado: mensagem de confirmação */}
              {status === 'connected' && (
                <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-sm text-green-500">
                  <p className="font-medium mb-1">WhatsApp Business ativo e monitorando</p>
                  <p className="text-green-500/80">
                    Mensagens contendo "{triggerKeyword}" são respondidas automaticamente pelo servidor,
                    mesmo com o painel fechado.
                  </p>
                </div>
              )}

              {/* Botões de ação */}
              <div className="flex gap-2 flex-wrap">
                {status !== 'connected' ? (
                  <Button
                    onClick={connectWhatsApp}
                    disabled={connecting}
                    className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2"
                  >
                    {connecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <QrCode className="w-4 h-4" />
                    )}
                    {connecting ? 'Gerando QR Code...' : 'Conectar WhatsApp'}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={disconnectWhatsApp}
                    disabled={disconnecting}
                    className="border-border text-muted-foreground hover:text-foreground gap-2"
                  >
                    {disconnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <WifiOff className="w-4 h-4" />
                    )}
                    Desconectar
                  </Button>
                )}
              </div>

              {status !== 'not_configured' && status !== 'connected' && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Verificando conexão automaticamente a cada 30 segundos
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card: Resposta automática */}
        {isConfigured && (
          <Card className="bg-background-paper border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Resposta Automática
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Palavra-chave que ativa a resposta
                </label>
                <input
                  value={triggerKeyword}
                  onChange={e => setTriggerKeyword(e.target.value)}
                  placeholder="Tenho interesse"
                  className="w-full h-10 rounded-md border border-border bg-secondary text-foreground px-3 text-sm placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Quando a mensagem recebida contiver esse texto, a resposta abaixo é enviada automaticamente
                </p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Mensagem de resposta automática
                </label>
                <textarea
                  value={autoReplyMessage}
                  onChange={e => setAutoReplyMessage(e.target.value)}
                  placeholder={`Olá! Obrigado pelo interesse no OneMed! 😊\n\nAcesse agora seu trial gratuito de 30 minutos:\nhttps://onemedcursos.com.br\n\nQualquer dúvida é só falar! 🩺`}
                  rows={7}
                  className="w-full rounded-md border border-border bg-secondary text-foreground px-3 py-2.5 text-sm placeholder:text-muted-foreground resize-none leading-relaxed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Essa mensagem será enviada para quem mandar "{triggerKeyword}" para o seu número
                </p>
              </div>
              <Button
                onClick={saveAutoReply}
                disabled={savingReply}
                className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2"
              >
                {savingReply ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar Resposta
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Card: Log de mensagens */}
        {isConfigured && (
          <Card className="bg-background-paper border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-foreground flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  Mensagens Recebidas
                  {messages.length > 0 && (
                    <span className="text-xs font-normal text-muted-foreground">
                      (últimas {messages.length})
                    </span>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchMessages}
                  disabled={messagesLoading}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className={`w-4 h-4 ${messagesLoading ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {messagesLoading && messages.length === 0 ? (
                <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                </div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma mensagem recebida ainda. As mensagens aparecerão aqui quando leads
                  enviarem mensagens para o seu WhatsApp Business.
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40 border border-border/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-medium text-foreground">
                            +{msg.phone_number || msg.remote_jid.replace('@s.whatsapp.net', '')}
                          </span>
                          {msg.replied ? (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 font-medium">
                              Respondido
                            </span>
                          ) : (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                              Não respondido
                            </span>
                          )}
                          {msg.error && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-medium">
                              Erro ao responder
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {msg.message_text || '(sem texto)'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(msg.received_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Saúde do rastreamento da Meta.
 *
 * Existe por causa de um apagão silencioso: o META_CAPI_ACCESS_TOKEN venceu em
 * 14/07/2026 e o mp-webhook seguiu chamando a Graph API, tomando erro 190 a
 * cada compra, por 17 dias — sem nada na tela e sem log (a retenção de log do
 * projeto é de minutos). O buraco só apareceu ao comparar o volume de Purchase
 * do pixel com as vendas do banco. Este card faz essa comparação sozinho, toda
 * vez que o admin abre o painel.
 */

type Health = {
  ok: boolean;
  summary: string;
  token?: { present: boolean; valid: boolean; expired: boolean; expires_at: string | null };
  pixels?: { pixel_id: string; reachable: boolean; error: string | null }[];
};

type Counters = {
  vendas_aprovadas: number;
  capi_enviadas_ok: number;
  capi_falhas: number;
  ultimo_erro: { quando: string; pixel: string; status: number; erro: string } | null;
  cobertura: {
    com_fbp: number; com_fbc: number; com_fbclid: number;
    com_ip: number; com_user_agent: number; total: number;
  };
};

export function MetaPixelHealthCard() {
  const [health, setHealth] = useState<Health | null>(null);
  const [counters, setCounters] = useState<Counters | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [{ data: h, error: hErr }, { data: c }] = await Promise.all([
        supabase.functions.invoke('admin-capi-health'),
        supabase.rpc('get_capi_health' as never, { _days: 7 } as never),
      ]);
      if (hErr) throw hErr;
      setHealth(h as Health);
      setCounters((c ?? null) as unknown as Counters | null);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const gap = counters ? counters.vendas_aprovadas - counters.capi_enviadas_ok : 0;
  const healthy = !!health?.ok && gap <= 0;

  return (
    <Card className="bg-background-paper border-border">
      <CardHeader>
        <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
          <Activity className={`w-5 h-5 ${healthy ? 'text-green-500' : 'text-red-500'}`} />
          Rastreamento Meta (Pixel + Conversions API)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !health && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Verificando…
          </div>
        )}

        {failed && (
          <p className="text-sm text-destructive">Não foi possível verificar o rastreamento.</p>
        )}

        {health && (
          <div className={`flex items-start gap-2 text-sm rounded-md p-3 border ${
            health.ok
              ? 'text-green-600 dark:text-green-500 bg-green-500/10 border-green-500/25'
              : 'text-red-600 dark:text-red-500 bg-red-500/10 border-red-500/25'
          }`}>
            {health.ok
              ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{health.summary}</span>
          </div>
        )}

        {counters && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Vendas aprovadas (7d)', value: counters.vendas_aprovadas },
                { label: 'Enviadas à Meta', value: counters.capi_enviadas_ok },
                { label: 'Falhas de envio', value: counters.capi_falhas },
              ].map(s => (
                <div key={s.label} className="bg-secondary border border-border rounded-md p-3">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="text-lg font-semibold text-foreground tabular-nums">{s.value}</div>
                </div>
              ))}
            </div>

            {gap > 0 && (
              <div className="flex items-start gap-2 text-sm text-yellow-700 dark:text-yellow-500 bg-yellow-500/10 border border-yellow-500/25 rounded-md p-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  <strong>{gap}</strong> venda(s) dos últimos 7 dias não chegaram à Meta pelo servidor.
                  Corrija o token e rode o reenvio — a Meta aceita eventos de até 7 dias atrás.
                </span>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Correspondência das {counters.cobertura.total} compras do período:{' '}
              fbp {counters.cobertura.com_fbp} · fbc {counters.cobertura.com_fbc} ·
              fbclid {counters.cobertura.com_fbclid} · IP {counters.cobertura.com_ip} ·
              user-agent {counters.cobertura.com_user_agent}
            </div>

            {counters.ultimo_erro && (
              <div className="text-xs font-mono text-muted-foreground bg-secondary border border-border rounded-md p-2.5">
                Último erro · pixel {counters.ultimo_erro.pixel} · HTTP {counters.ultimo_erro.status}
                <div className="text-destructive mt-1">{counters.ultimo_erro.erro}</div>
              </div>
            )}
          </>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={load} disabled={loading} variant="outline" size="sm" className="gap-2">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Verificar agora
          </Button>

          {gap > 0 && health?.ok && (
            <Button
              size="sm"
              className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2"
              onClick={async () => {
                // Simulação primeiro: mostra quanto seria reenviado antes de
                // mexer em qualquer dado de campanha.
                const { data: preview } = await supabase.functions.invoke('admin-capi-backfill', { body: {} });
                const n = preview?.a_reenviar ?? 0;
                if (!n) { toast.info('Não há compras pendentes de envio.'); return; }
                if (!window.confirm(`Reenviar ${n} compra(s) para a Meta?`)) return;
                const { data: applied } = await supabase.functions.invoke('admin-capi-backfill', { body: { apply: true } });
                toast.success(`Reenvio concluído: ${applied?.envios_ok ?? 0} ok, ${applied?.envios_com_falha ?? 0} falha(s).`);
                load();
              }}
            >
              Reenviar compras não enviadas
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

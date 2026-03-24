import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database } from 'lucide-react';

export default function DatabasePage() {
  const [tables, setTables] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [accesses, buyers, coupons, visits, trials] = await Promise.all([
        supabase.from('accesses').select('id', { count: 'exact', head: true }),
        supabase.from('buyers').select('id', { count: 'exact', head: true }),
        supabase.from('coupons').select('id', { count: 'exact', head: true }),
        supabase.from('visits').select('id', { count: 'exact', head: true }),
        supabase.from('accesses').select('id', { count: 'exact', head: true }).eq('access_type', 'trial'),
      ]);
      setTables({
        'accesses': accesses.count || 0,
        'buyers': buyers.count || 0,
        'coupons': coupons.count || 0,
        'visits': visits.count || 0,
        'trials': trials.count || 0,
      });
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-secondary text-3xl font-bold text-foreground">Database</h1>
          <p className="text-muted-foreground mt-1">Visão geral do banco de dados</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(tables).map(([table, count]) => (
            <Card key={table} className="bg-background-paper border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <Database className="w-4 h-4 text-primary" />
                  <span className="font-secondary text-2xl font-bold text-foreground">{loading ? '—' : count}</span>
                </div>
                <p className="text-sm text-muted-foreground font-mono">{table}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-background-paper border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">Tabelas do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {[
                { name: 'accesses', desc: 'Todos os acessos (trial e pagos)' },
                { name: 'buyers', desc: 'Compradores e pagamentos' },
                { name: 'coupons', desc: 'Cupons de desconto' },
                { name: 'visits', desc: 'Visitas ao site (analytics)' },
                { name: 'drive_config', desc: 'Configuração do Google Drive' },
                { name: 'user_roles', desc: 'Roles de administradores' },
              ].map(t => (
                <div key={t.name} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                  <span className="font-mono text-foreground">{t.name}</span>
                  <span className="text-muted-foreground">{t.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

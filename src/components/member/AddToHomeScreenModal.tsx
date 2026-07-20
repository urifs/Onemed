import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Smartphone, Share, Plus, MoreVertical } from 'lucide-react';

export function AddToHomeScreenModal({ trigger }: { trigger: React.ReactNode }) {
  const [tab, setTab] = useState<'ios' | 'android'>('ios');

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-background-paper border-border max-w-sm">
        <DialogHeader>
          <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center mb-2">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <DialogTitle className="text-foreground">Instalar o App OneMed</DialogTitle>
        </DialogHeader>

        <div className="flex rounded-lg bg-secondary p-1 gap-1">
          <button
            onClick={() => setTab('ios')}
            className={`flex-1 h-9 rounded-md text-sm font-medium transition-colors ${tab === 'ios' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            iPhone
          </button>
          <button
            onClick={() => setTab('android')}
            className={`flex-1 h-9 rounded-md text-sm font-medium transition-colors ${tab === 'android' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Android
          </button>
        </div>

        {tab === 'ios' ? (
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground">1</span>
              <span className="pt-0.5">
                No Safari, toque no botão de compartilhar <Share className="w-3.5 h-3.5 inline mx-0.5 -mt-0.5" /> na barra inferior
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground">2</span>
              <span className="pt-0.5">Toque em "Adicionar à Tela de Início"</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground">3</span>
              <span className="pt-0.5">Toque em "Adicionar" no canto superior direito</span>
            </li>
          </ol>
        ) : (
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground">1</span>
              <span className="pt-0.5">
                No Chrome, toque no menu <MoreVertical className="w-3.5 h-3.5 inline mx-0.5 -mt-0.5" /> no canto superior direito
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground">2</span>
              <span className="pt-0.5">
                Toque em "Adicionar à tela inicial" <Plus className="w-3.5 h-3.5 inline mx-0.5 -mt-0.5" />
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground">3</span>
              <span className="pt-0.5">Confirme tocando em "Adicionar" ou "Instalar"</span>
            </li>
          </ol>
        )}

        <p className="text-xs text-muted-foreground text-center pt-1">
          O ícone do OneMed aparecerá na sua tela inicial, como um app.
        </p>
      </DialogContent>
    </Dialog>
  );
}

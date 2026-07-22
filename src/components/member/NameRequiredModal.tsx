import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface NameRequiredModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
}

export function NameRequiredModal({ open, onOpenChange, onSubmit }: NameRequiredModalProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSubmit(name);
    setSaving(false);
    setName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background-paper border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Como podemos te chamar?</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Antes de comentar na comunidade, precisamos do seu nome — ele vai aparecer nos seus comentários e respostas.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Seu nome"
          autoFocus
          className="bg-secondary border-border text-foreground"
        />
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()} className="bg-primary hover:bg-primary-hover text-primary-foreground w-full">
            {saving ? 'Salvando...' : 'Confirmar e continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

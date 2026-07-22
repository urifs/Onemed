import { Link } from 'react-router-dom';
import { Stethoscope, MessageCircle } from 'lucide-react';
import { AccountMenu } from './AccountMenu';
import { NotificationsBell } from './NotificationsBell';
import { TrialCountdownBar } from './TrialCountdownBar';
import { MemberPWAHead } from './MemberPWAHead';

export function MemberHeader() {
  return (
    <>
      <MemberPWAHead />
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/75 border-b border-border">
        <div className="max-w-[1400px] mx-auto flex items-center gap-3 md:gap-5 px-4 md:px-8 py-3.5">
          <Link to="/membros" className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 bg-primary/15 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <span className="font-secondary font-bold text-lg text-foreground">OneMed</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-1">
            <Link to="/membros" className="text-sm font-medium px-3 py-1.5 rounded-full bg-secondary text-foreground">
              Início
            </Link>
          </nav>

          <div className="flex-1" />

          <Link
            to="/membros/comunidade"
            className="w-9 h-9 shrink-0 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            title="Comunidade"
          >
            <MessageCircle className="w-4 h-4" />
          </Link>
          <NotificationsBell />
          <AccountMenu />
        </div>
      </header>
      <TrialCountdownBar />
    </>
  );
}

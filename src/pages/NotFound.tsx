import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, LogIn, Search, Stethoscope } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

// Esta página era o 404 que vem no template do Vite — em inglês ("Oops! Page
// not found"), sem marca e sem saída. Quem cai aqui em geral veio de um link
// antigo de e-mail ou digitou a URL errada, então o que serve é dizer onde ele
// está e oferecer os dois destinos reais: entrar na plataforma ou ver o
// catálogo.
const NotFound = () => {
  const location = useLocation();
  const dentroDaArea = location.pathname.startsWith('/membros') || location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <ThemeToggle className="fixed top-4 right-4 z-50" />
      <div className="w-full max-w-md text-center">
        <Link to="/" className="inline-flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-primary" />
          </div>
          <span className="font-secondary font-bold text-2xl text-foreground">OneMed</span>
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8">
          <p className="font-mono text-sm text-muted-foreground mb-3">404</p>
          <h1 className="font-secondary text-2xl font-bold text-foreground mb-3">
            Esta página não existe
          </h1>
          <p className="text-muted-foreground text-sm mb-7">
            {dentroDaArea
              ? 'O endereço pode ter mudado, ou o conteúdo não está mais disponível neste link.'
              : 'O link pode estar incompleto ou ter sido desativado. Confira o endereço ou siga por um dos caminhos abaixo.'}
          </p>

          <div className="space-y-2.5">
            <Link
              to="/login"
              className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <LogIn className="w-4 h-4" /> Entrar na plataforma
            </Link>
            <Link
              to="/cursos"
              className="w-full h-12 border border-border hover:border-primary/50 bg-secondary hover:bg-secondary/70 text-foreground font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Search className="w-4 h-4" /> Ver os cursos disponíveis
            </Link>
          </div>
        </div>

        <p className="mt-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar para a página inicial
          </Link>
        </p>
      </div>
    </div>
  );
};

export default NotFound;

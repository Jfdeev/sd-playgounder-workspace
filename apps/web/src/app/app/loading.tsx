import { Loader2 } from 'lucide-react';

// Ajustes gerais (US5): retorno imediato ao trocar de tela dentro de /app — antes o clique ficava sem
// resposta até a página inteira (com as consultas ao banco) chegar do servidor.
export default function AppLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-1 items-center justify-center gap-2 text-sm text-zinc-500">
      <Loader2 className="size-4 animate-spin text-violet-400" aria-hidden />
      Carregando…
    </div>
  );
}

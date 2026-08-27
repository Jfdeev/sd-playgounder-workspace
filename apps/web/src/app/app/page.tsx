import { CanvasWorkspace } from '@/components/canvas/canvas-workspace';

// Canvas livre (sandbox) — pedido direto do autor: "o usuário pode entrar no canvas sem
// necessariamente fazer um desafio". Substitui o redirect anterior pro único problema de M1
// (`ALL_PROBLEM_IDS[0]`) — entrar num desafio agora é uma ação dentro do canvas (menu "Desafios"
// na barra de utilitários), não mais uma rota obrigatória.
export default function AppIndexPage() {
  return <CanvasWorkspace initialProblemId={null} />;
}

import { redirect } from 'next/navigation';
import { ALL_PROBLEM_IDS } from '@sdp/problems';

// 1 problema neste marco (M1) — redireciona direto pra ele. A forma de rota /app/[problemId] já
// fica pronta pra biblioteca de problemas de M4 sem exigir reescrita depois (plan.md, Structure
// Decision). Substitui o placeholder "Você está dentro do..." de M0.5, que cumpriu seu propósito.
export default function AppIndexPage() {
  redirect(`/app/${ALL_PROBLEM_IDS[0]}`);
}

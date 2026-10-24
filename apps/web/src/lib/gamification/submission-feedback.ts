import { ACHIEVEMENTS } from './achievements';
import type { ProgressJson } from './progress';

/**
 * Mensagem mostrada depois de "Submeter" (M2.8), a partir da resposta de `POST /api/submissions`.
 * O resultado do engine já está na tela (calculado no navegador) — isto só diz o que aconteceu com o
 * progresso, e nunca mostra XP que o servidor não confirmou (FR-013).
 */

export type SubmissionResponseBody = {
  solved: boolean;
  credited: { xp: number; achievements: string[] };
  progress: ProgressJson;
};

export type SubmissionFeedback = { tone: 'success' | 'info' | 'warning'; text: string } | null;

function achievementNames(ids: readonly string[]): string {
  return ids.map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id).join(', ');
}

export function describeSubmissionOutcome(status: number, body: SubmissionResponseBody | null): SubmissionFeedback {
  if (status === 200 && body) {
    const conquests = body.credited.achievements.length > 0 ? ` Conquista: ${achievementNames(body.credited.achievements)}.` : '';
    if (body.credited.xp > 0) return { tone: 'success', text: `+${body.credited.xp} XP — desafio resolvido!${conquests}` };
    if (body.solved) return { tone: 'info', text: `Você já tinha resolvido este desafio — sem XP novo.${conquests}` };
    return conquests ? { tone: 'success', text: conquests.trim() } : null;
  }
  if (status === 401) return { tone: 'warning', text: 'Sua sessão expirou — entre de novo pra registrar o progresso (o design continua salvo neste navegador).' };
  if (status === 429) return { tone: 'warning', text: 'Muitas submissões seguidas — o progresso desta não foi registrado. Tente de novo em um minuto.' };
  return { tone: 'warning', text: 'Não deu pra registrar o progresso agora — o resultado acima continua valendo.' };
}

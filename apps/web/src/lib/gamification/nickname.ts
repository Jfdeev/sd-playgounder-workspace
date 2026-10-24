/**
 * Apelido do perfil público (M2.8, content-draft.md §3): 3–20 caracteres, só `a–z`, `0–9` e `_`,
 * começando com letra. Guardado em minúsculas — é isso que torna a unicidade insensível a
 * maiúsculas (o índice único do banco compara a forma normalizada).
 */

const NICKNAME_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;

export type NicknameValidation = { ok: true; nickname: string } | { ok: false; reason: string };

export function normalizeNickname(raw: unknown): NicknameValidation {
  if (typeof raw !== 'string') return { ok: false, reason: 'Apelido inválido.' };
  const nickname = raw.trim().toLowerCase();
  if (nickname.length < 3 || nickname.length > 20) return { ok: false, reason: 'O apelido precisa ter de 3 a 20 caracteres.' };
  if (!NICKNAME_PATTERN.test(nickname)) {
    return { ok: false, reason: 'Use só letras sem acento, números e _, começando com uma letra.' };
  }
  return { ok: true, nickname };
}

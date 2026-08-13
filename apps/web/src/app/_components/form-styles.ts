// Classes Tailwind compartilhadas entre os formulários de /criar-conta e /entrar — evita repetir
// a mesma string de utilitários em cada input/botão dos dois arquivos.
export const inputClassName =
  'w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2.5 pl-10 pr-3 text-sm text-white ' +
  'placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500';

export const primaryButtonClassName =
  'w-full rounded-lg bg-violet-500 py-2.5 text-sm font-semibold text-white transition ' +
  'hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50';

export const googleButtonClassName =
  'flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 py-2.5 ' +
  'text-sm font-medium text-zinc-300 transition hover:bg-zinc-800';

export const fieldErrorClassName = 'mt-1.5 text-xs text-red-400';

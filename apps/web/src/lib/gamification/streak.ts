/**
 * Ofensiva do M2.8 (FR-007): dias corridos com pelo menos uma atividade verificada. O "dia" é o do
 * fuso de São Paulo (spec, Assumptions) — calculado com `Intl`, nunca somando offset à mão (o
 * offset muda com horário de verão). Dias são strings `YYYY-MM-DD`; a aritmética entre eles é feita
 * em dias UTC "de calendário", sem fuso, então não sofre com virada de horário.
 */

const TIME_ZONE = 'America/Sao_Paulo';
const MS_PER_DAY = 86_400_000;

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export type Streak = { current: number; best: number };

/** Dia de calendário (`YYYY-MM-DD`) de um instante, no fuso de São Paulo. */
export function toLocalDay(instant: Date): string {
  return dayFormatter.format(instant);
}

function dayNumber(day: string): number {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, date) / MS_PER_DAY;
}

/**
 * `days` em qualquer ordem e com repetição (o mesmo dia conta uma vez). A ofensiva atual continua
 * valendo se a última atividade foi hoje ou ontem (o dia de hoje ainda não acabou); com um dia
 * inteiro sem atividade ela volta a zero, e o recorde é preservado.
 */
export function computeStreak(days: readonly string[], today: string): Streak {
  const sorted = [...new Set(days.map(dayNumber))].sort((a, b) => a - b);
  if (sorted.length === 0) return { current: 0, best: 0 };

  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    run = sorted[i]! - sorted[i - 1]! === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }

  const daysSinceLast = dayNumber(today) - sorted[sorted.length - 1]!;
  return { current: daysSinceLast <= 1 ? run : 0, best };
}

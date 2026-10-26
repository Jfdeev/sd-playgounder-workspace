/**
 * Regra fixa de zonas do M3 (gate 2 do plan, aprovado pelo autor): todo componente espalha suas
 * réplicas em rodízio por 3 zonas — a réplica `i` fica na zona `i % 3`. O `Design` não tem zonas e o
 * canvas não as mostra; a regra é o que torna "zona caída" determinística e corrigível só com mais
 * réplicas.
 */

export const ZONE_COUNT = 3;
export type Zone = 0 | 1 | 2;

/** Quantas das `replicas` de um componente estão na zona `zone` (zona 0 tem `ceil(r/3)`). */
export function replicasInZone(replicas: number, zone: Zone): number {
  if (replicas <= zone) return 0;
  return Math.floor((replicas - zone - 1) / ZONE_COUNT) + 1;
}

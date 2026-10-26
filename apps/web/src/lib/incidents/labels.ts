import type { ViolationType } from '@sdp/engine';
import type { FaultType, FixCheck } from '@sdp/problems';

/**
 * Rótulos em pt-br do Modo Incidente (M3). `Record` exaustivo: um tipo de falha ou checagem nova sem
 * rótulo quebra o `tsc`.
 */

export const FAULT_TYPE_LABELS: Record<FaultType, string> = {
  'node-down': 'Nó caído (instâncias perdidas)',
  'zone-down': 'Zona de disponibilidade caída',
  partition: 'Partição de rede',
  'cache-cold': 'Cache frio',
  'pool-exhausted': 'Pool de conexões esgotado',
};

export const FIX_CHECK_LABELS: Record<FixCheck, string> = {
  p99: 'A latência p99 ainda está acima do aceitável.',
  saturation: 'Ainda há componente saturado.',
  throughput: 'O sistema não está atendendo toda a carga.',
  'component-removed': 'O fix removeu um componente que a arquitetura já tinha — o fix pode acrescentar e reforçar, não remover.',
  'component-down': 'Com a falha ainda ativa, algum componente desaparece por completo.',
  'target-unreachable': 'O componente afetado continua sem receber tráfego.',
  'new-orphans': 'O fix deixou componentes sem tráfego (órfãos).',
};

/** Violações que podem aparecer num snapshot de incidente; as demais caem no nome técnico. */
const VIOLATION_LABELS: Partial<Record<ViolationType, string>> = {
  spof: 'Ponto único de falha',
  'orphan-node': 'Sem tráfego (órfão)',
  cycle: 'Ciclo',
};

export function violationLabel(type: ViolationType): string {
  return VIOLATION_LABELS[type] ?? type;
}

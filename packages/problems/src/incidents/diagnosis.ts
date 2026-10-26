import type { NodeId } from '@sdp/engine';
import type { Fault, FaultType } from './faults.js';

/**
 * Comparação do diagnóstico (M3, US2): par (componente, tipo de falha) contra a falha plantada.
 * Duas regras de modelagem, explícitas: zona caída não tem componente culpado (a causa é a zona) —
 * vale o tipo certo com qualquer componente; partição corta a ligação entre dois componentes — vale
 * qualquer uma das duas pontas. A mesma regra decide o que a busca de unicidade considera "a mesma
 * resposta", então justiça e correção usam um critério só.
 */

export type DiagnosisVerdict = 'correct' | 'right-component' | 'wrong';

/** Componentes que contam como "o componente certo" para esta falha (`null` = qualquer um). */
export function acceptedComponents(fault: Fault): readonly NodeId[] | null {
  if (fault.type === 'zone-down') return null;
  if (fault.type === 'partition') return [fault.target, fault.cutFrom];
  return [fault.target];
}

export function diagnose(fault: Fault, nodeId: NodeId, faultType: FaultType): DiagnosisVerdict {
  const components = acceptedComponents(fault);
  const componentRight = components === null || components.includes(nodeId);
  if (componentRight && faultType === fault.type) return 'correct';
  return componentRight && components !== null ? 'right-component' : 'wrong';
}

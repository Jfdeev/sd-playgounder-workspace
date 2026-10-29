/**
 * Critérios de rubrica que se repetem entre problemas (M4.2, FR-007) — packages/problems/src/rubric-criteria.ts
 *
 * Mesma regra de `RubricCriterion`: só comparam o que `simulate()` já produziu (ou a estrutura do
 * design), nunca derivam um número novo.
 */

import type { ComponentType, Design } from '@sdp/engine';
import type { RubricCriterion } from './types.js';

/** p99 do caminho crítico dentro do orçamento do problema — id fixo, o mesmo de `latencyBudgetMs`. */
export function latencyWithin(budgetMs: number, label: string): RubricCriterion {
  return { id: 'latency-p99', label, evaluate: (result) => result.path.latency.p99 <= budgetMs };
}

export const NO_SATURATED_NODE: RubricCriterion = {
  id: 'no-saturated-node',
  label: 'Nenhum componente saturado',
  evaluate: (result) => Object.values(result.nodes).every((node) => node.status !== 'saturated'),
};

export const NO_SPOF: RubricCriterion = {
  id: 'no-spof',
  label: 'Sem ponto único de falha no caminho crítico',
  evaluate: (result) => !result.violations.some((violation) => violation.type === 'spof'),
};

/** O design tem ao menos um nó de algum dos tipos. */
export function usesComponent(id: string, label: string, ...types: ComponentType[]): RubricCriterion {
  return { id, label, evaluate: (_result, design) => design.nodes.some((node) => types.includes(node.type)) };
}

/** Existe uma aresta de um nó de `fromTypes` para um nó de `toTypes`. */
export function connects(
  id: string,
  label: string,
  fromTypes: readonly ComponentType[],
  toTypes: readonly ComponentType[],
): RubricCriterion {
  return {
    id,
    label,
    evaluate: (_result, design) => {
      const typeOf = nodeTypes(design);
      return design.edges.some((edge) => {
        const from = typeOf.get(edge.from);
        const to = typeOf.get(edge.to);
        return from !== undefined && to !== undefined && fromTypes.includes(from) && toTypes.includes(to);
      });
    },
  };
}

function nodeTypes(design: Design): Map<string, ComponentType> {
  return new Map(design.nodes.map((node) => [node.id, node.type]));
}

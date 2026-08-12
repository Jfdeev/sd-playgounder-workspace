/**
 * Validação estrutural do Design — packages/engine/src/graph/validate.ts
 *
 * Nunca lança exceção (FR-019, constitution: engine sem side effects). Qualquer problema
 * estrutural vira uma Violation no resultado.
 */

import type { Design, Violation } from '../types.js';

/**
 * Valida a estrutura do Design (referências de aresta, IDs duplicados, contagem de réplicas).
 * Não valida alcançabilidade nem ciclos — isso é responsabilidade de graph/static-analysis.ts,
 * que roda depois, sobre um grafo já estruturalmente válido.
 */
export function validateStructure(design: Design): Violation[] {
  const violations: Violation[] = [];

  const duplicateIds = findDuplicateNodeIds(design);
  if (duplicateIds.length > 0) {
    violations.push({
      type: 'duplicate-node-id',
      nodeIds: duplicateIds,
      message: `IDs de nó duplicados: ${duplicateIds.join(', ')}`,
    });
  }

  const nodeIds = new Set(design.nodes.map((node) => node.id));

  for (const edge of design.edges) {
    const fromMissing = !nodeIds.has(edge.from);
    const toMissing = !nodeIds.has(edge.to);
    if (fromMissing || toMissing) {
      violations.push({
        type: 'broken-edge-reference',
        nodeIds: [edge.from, edge.to].filter((id) => !nodeIds.has(id)),
        edgeIds: [edge.id],
        message: `Aresta '${edge.id}' referencia nó inexistente (${fromMissing ? edge.from : edge.to})`,
      });
    }
  }

  for (const node of design.nodes) {
    if (!Number.isInteger(node.replicas) || node.replicas < 1) {
      violations.push({
        type: 'invalid-replica-count',
        nodeIds: [node.id],
        message: `Nó '${node.id}' tem contagem de réplicas inválida: ${node.replicas} (deve ser inteiro ≥ 1)`,
      });
    }
  }

  return violations;
}

function findDuplicateNodeIds(design: Design): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const node of design.nodes) {
    if (seen.has(node.id)) {
      duplicates.add(node.id);
    }
    seen.add(node.id);
  }
  return [...duplicates];
}

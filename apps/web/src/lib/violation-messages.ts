/**
 * Formatação de mensagem de violação — apps/web/src/lib/violation-messages.ts
 *
 * `Violation.message` (packages/engine) embute o `NodeId` bruto (UUID) — legível pro engine
 * (constitution: mensagem gerada por ele, nunca por LLM), mas ilegível pro usuário ("Nó
 * 'e5bbd976-...' é ponto único de falha"). Em vez de re-derivar o texto da violação aqui (o que
 * duplicaria a lógica de FR-009/FR-010/FR-011 já implementada em packages/engine — proibido por
 * `docs/product-context.md` §5, "UI recalculando métrica por conta própria"), este módulo só
 * SUBSTITUI cada `NodeId` que já vem estruturado em `Violation.nodeIds` pelo rótulo amigável do
 * componente (mesmo `COMPONENT_UI[type].label` já usado pro gargalo e pelos cards por nó em
 * `result-panel.tsx`) — o texto continua vindo inteiramente do engine, só troca o identificador.
 */
export function formatViolationMessage(
  message: string,
  nodeIds: readonly string[],
  labelOf: (nodeId: string) => string,
): string {
  return nodeIds.reduce((formatted, nodeId) => formatted.replaceAll(nodeId, labelOf(nodeId)), message);
}

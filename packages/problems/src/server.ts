/**
 * Entrada **só-servidor** de `@sdp/problems` (M3, research.md §4): a parte secreta dos incidentes
 * (causa plantada, critério e fix de referência). Importada apenas por Route Handlers / Server
 * Components de `apps/web` — o índice do pacote, que o navegador importa, nunca a reexporta. A
 * checagem do bundle (quickstart) confirma que nada daqui chega a `.next/static`.
 */
export { getIncidentSecret, type IncidentSecret } from './incidents/secret.js';

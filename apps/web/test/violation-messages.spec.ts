import { describe, expect, it } from 'vitest';
import { formatViolationMessage } from '../src/lib/violation-messages';

describe('formatViolationMessage', () => {
  it('troca um único nodeId pelo rótulo amigável (caso spof/orphan-node/invalid-replica-count)', () => {
    const message = "Nó 'e5bbd976-6e4c-43ab-a559-d2ffab2b4bc5' é ponto único de falha: apenas 1 réplica(s) no caminho crítico";
    const labelOf = (id: string) => (id === 'e5bbd976-6e4c-43ab-a559-d2ffab2b4bc5' ? 'App Server' : id);

    expect(formatViolationMessage(message, ['e5bbd976-6e4c-43ab-a559-d2ffab2b4bc5'], labelOf)).toBe(
      "Nó 'App Server' é ponto único de falha: apenas 1 réplica(s) no caminho crítico",
    );
  });

  it('troca todos os nodeIds quando há mais de um (caso cycle/duplicate-node-id)', () => {
    const message = 'Ciclo detectado envolvendo: node-a, node-b';
    const labelOf = (id: string) => ({ 'node-a': 'Load Balancer', 'node-b': 'App Server' })[id] ?? id;

    expect(formatViolationMessage(message, ['node-a', 'node-b'], labelOf)).toBe(
      'Ciclo detectado envolvendo: Load Balancer, App Server',
    );
  });

  it('não altera a mensagem quando nodeIds está vazio', () => {
    const message = "Aresta 'e1' referencia nó inexistente (missing-id)";
    expect(formatViolationMessage(message, [], () => 'não deveria ser chamado')).toBe(message);
  });

  it('mantém o id original quando labelOf não encontra o nó (fallback do próprio chamador)', () => {
    const message = "Nó 'sem-canvas' está desconectado do caminho da requisição — não pontua";
    const labelOf = (id: string) => id; // mesmo fallback usado em nodeLabel() de result-panel.tsx

    expect(formatViolationMessage(message, ['sem-canvas'], labelOf)).toBe(message);
  });

  it('não faz substituição parcial acidental quando um id é prefixo textual de outro trecho', () => {
    // UUIDs reais nunca colidem como substring um do outro, mas a função não deve quebrar se um
    // nodeId aparecer mais de uma vez na mesma mensagem.
    const message = "Nó 'dup-1' duplicado: dup-1";
    expect(formatViolationMessage(message, ['dup-1'], () => 'Cache')).toBe("Nó 'Cache' duplicado: Cache");
  });
});

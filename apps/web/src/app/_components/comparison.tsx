// Concorrentes citados em docs/product-context.md §1. Framing deliberado: descrevemos a NOSSA
// abordagem (determinística, reproduzível) sem afirmar como fato verificado o funcionamento
// interno de cada ferramenta de terceiros — copy pública, não uma auditoria de concorrentes.
const KNOWN_TOOLS = [
  'System Design Arena',
  'ScaleDojo',
  'SystemSloth',
  'Scalcraft',
  'Codemia',
  'mockingly.ai',
  'systemdesignsandbox.com',
  'SystemForge',
  'paperdraw.dev',
] as const;

export function Comparison() {
  return (
    <section>
      <h2>Nossa abordagem é diferente</h2>
      <p>
        Se você já testou outras ferramentas de estudo de system design ({KNOWN_TOOLS.join(', ')}
        , entre outras), talvez tenha notado um padrão comum: um LLM olha seu diagrama e dá uma
        nota. Isso é ruidoso — o modelo tende a premiar o desenho que <em>parece</em> certo, não o
        que de fato aguenta carga, e a mesma arquitetura pode receber notas diferentes em
        tentativas diferentes.
      </p>
      <p>
        Aqui, todo número — gargalo, p99, custo, ponto único de falha — sai de um cálculo
        determinístico. O LLM só recebe o resultado pronto para explicar em linguagem natural,
        nunca julga. Mesmo design, mesma nota, sempre: reprodutibilidade que dá para confiar.
      </p>
    </section>
  );
}

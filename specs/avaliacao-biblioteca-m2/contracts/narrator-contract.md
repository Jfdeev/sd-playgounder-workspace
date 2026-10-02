# Contrato: `POST /api/narrator`

Route Handler novo, mesmo padrão dos já existentes em `apps/web/src/app/api/account/*`.

## Request

```ts
type NarratorRequest = {
  design: Design;         // @sdp/engine — o mesmo Design que gerou `result`
  workload: Workload;     // @sdp/engine
  result: SimulationResult; // @sdp/engine — já calculado no client, nunca recalculado aqui
};
```

**Regra 1**: o servidor NUNCA recalcula `simulate(design, workload)` pra conferir `result` — o
Route Handler confia no `result` recebido (mesmo modelo de confiança de M1: submissão é 100%
client-side, sem persistência "oficial" que dependa desse resultado — narrador é só explicação,
nunca fonte de verificação de progressão/rubrica, que já roda inteiramente no client desde M1).

**Regra 2**: `design`/`workload` só são usados para computar o hash de cache (research.md §3) —
nunca enviados ao provedor de LLM. Só `result` (já resumido: nós, gargalo, latência, custo,
violações, e — desde M2.6/US4 — o bloco de conhecimento selecionado por
`selectRelevantKnowledge(result)`) vai no prompt, nunca a estrutura bruta do grafo.

**Regra 2.1 (M2.6, US4)**: o hash de cache (`hashDesign`) inclui `NARRATOR_PROMPT_VERSION` desde
que o bloco de conhecimento foi adicionado ao prompt — uma explicação cacheada de antes dessa
mudança nunca é servida como se refletisse o prompt atual. A verificação de 20 submissões
consecutivas (exit criterion deste marco) MUST rodar contra o prompt na versão atual, não contra a
versão original de M2 sem citação.

## Response (200 — sucesso, cache hit ou miss)

```ts
type NarratorResponse = {
  summary: string;
  bottleneckExplanation: string;
  recommendation?: string;
  citation_id?: string; // M2.6, US4 — id de uma ficha de @sdp/knowledge; ausente na maioria das respostas
  cached: boolean; // true = veio de narratorExplanations, sem chamada nova ao provedor (RNF-6)
};
```

**Regra 3 (M2.6, US4)**: `citation_id`, quando presente, MUST ser um id que estava genuinamente no
bloco de conhecimento enviado ao provedor nesta chamada (`selectRelevantKnowledge(result)`) — nunca
só "um id real de `@sdp/knowledge`" (o schema valida isso, mas não que o modelo o tenha visto). O
Route Handler descarta (não rejeita a resposta inteira) qualquer `citation_id` fora desse conjunto
antes de cachear/responder — mesmo princípio da Regra 1 de nunca confiar cegamente no que o
provedor devolveu.

## Response (erro — provedor indisponível, timeout, schema inválido devolvido pelo LLM)

```ts
type NarratorErrorResponse = {
  error: 'PROVIDER_UNAVAILABLE' | 'TIMEOUT' | 'INVALID_RESPONSE';
  message: string; // texto amigável pra exibir na UI — nunca inventa uma explicação no lugar
};
```

Status HTTP: `502` (`PROVIDER_UNAVAILABLE`/`INVALID_RESPONSE`) ou `504` (`TIMEOUT`, RNF-5: acima de
15s — subido de 5s em 2026-09-27, `specs/fundamentos-arquitetura/tasks.md` achado 4). **Nunca 200
com um corpo inventado** — se o narrador falha, a UI mostra o erro, nunca um texto que pareça uma
explicação válida (edge case do spec.md).

## Autenticação

Mesma regra de `/app` — `auth()` chamado direto no Route Handler (sem middleware novo, decisão já
tomada em M0.5/M1); requisição sem sessão válida devolve `401`.

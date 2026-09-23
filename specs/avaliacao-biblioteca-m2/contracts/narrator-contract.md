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
violações) vai no prompt, nunca a estrutura bruta do grafo.

## Response (200 — sucesso, cache hit ou miss)

```ts
type NarratorResponse = {
  summary: string;
  bottleneckExplanation: string;
  recommendation?: string;
  cached: boolean; // true = veio de narratorExplanations, sem chamada nova ao provedor (RNF-6)
};
```

## Response (erro — provedor indisponível, timeout, schema inválido devolvido pelo LLM)

```ts
type NarratorErrorResponse = {
  error: 'PROVIDER_UNAVAILABLE' | 'TIMEOUT' | 'INVALID_RESPONSE';
  message: string; // texto amigável pra exibir na UI — nunca inventa uma explicação no lugar
};
```

Status HTTP: `502` (`PROVIDER_UNAVAILABLE`/`INVALID_RESPONSE`) ou `504` (`TIMEOUT`, RNF-5: acima de
5s). **Nunca 200 com um corpo inventado** — se o narrador falha, a UI mostra o erro, nunca um texto
que pareça uma explicação válida (edge case do spec.md).

## Autenticação

Mesma regra de `/app` — `auth()` chamado direto no Route Handler (sem middleware novo, decisão já
tomada em M0.5/M1); requisição sem sessão válida devolve `401`.

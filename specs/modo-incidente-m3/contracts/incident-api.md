# Contrato: API do Modo Incidente (M3)

Todas: `auth()` (401 sem sessão); as de escrita checam mesma origem (403) e consomem a mesma quota do
M2.8 (429). **Nenhuma resposta contém a falha plantada antes do diagnóstico certo** (FR-005), nem
réplicas/capacidade/taxa de acerto do design com falha (lista branca).

## `GET /api/incidents/[id]`

```json
{ "snapshot": { "nodes": { "app": { "utilization": 0.97, "status": "warning", "offeredLoad": 1000 } },
                "path": { "latency": { "p50": 40, "p95": 900, "p99": 1200 }, "throughputRps": 1000 },
                "violations": [] },
  "status": { "diagnosed": false, "resolved": false } }
```

`404 UNKNOWN_INCIDENT`. O estado "antes" não vem daqui: o cliente calcula sobre o design público.

## `POST /api/incidents/[id]/diagnosis`

Corpo: `{ "nodeId": "db", "faultType": "cache-cold" }` (qualquer outro campo é ignorado).

```json
{ "verdict": "right-component", "credited": { "achievements": [] }, "progress": { ... } }
```

`credited.achievements`: conquistas que esta atividade destravou (a tentativa conta pra ofensiva, então
pode desbloquear "3 dias seguidos"). `progress` é o progresso do próprio usuário (sem nada da causa).

`verdict`: `correct` (registra `incident-diagnosis:<id>`, idempotente) | `right-component` (componente
certo, tipo errado) | `wrong`. Nunca devolve a resposta certa. `faultType` fora dos 5 → 400.

## `POST /api/incidents/[id]/fix`

Corpo: `{ "design": { ... } }` — validado como no M2.8 (`validateSubmittedDesign`).

- Sem diagnóstico certo registrado → `409 { "error": "DIAGNOSIS_REQUIRED" }`.
- O servidor aplica a falha ao design submetido e roda o critério do incidente.

```json
{ "resolved": false, "failing": ["p99", "target-unreachable"], "snapshot": { ... },
  "credited": { "xp": 0, "achievements": [] }, "progress": { ... } }
```

`resolved: true` → `incident:<id>` creditado (100 XP, uma vez). `failing` lista só **quais** checagens
do critério falharam (nomes fixos), nunca os limites internos além do que o alerta já disse.

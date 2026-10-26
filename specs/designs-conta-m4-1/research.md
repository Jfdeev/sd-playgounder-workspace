# Research: M4.1 — Designs na conta, histórico e compartilhamento

## 1. O que salvar: o canvas, não o `Design`

O `Design` do engine perde posição, nós Cliente e o vínculo com arquitetura de referência — reabrir
ficaria diferente (FR-003). **Decisão**: formato próprio `SavedCanvas` = nós (id, tipo de nó, posição,
dados sem `result`/seleção), arestas (id, origem, destino, tipo, peso) e `loadedPresetId`. Conversão
pura nos dois sentidos; o `Design` do engine continua derivado por `canvasDesignOf` (SC-005 por
construção).

## 2. Versões sem transação

`neon-http` não tem transação (conferido no M2.8). **Decisão**: `designVersions` com restrição única
`(designId, number)`; a versão nasce num único `INSERT … SELECT coalesce(max(number), 0) + 1` — duas
abas salvando ao mesmo tempo: uma ganha, a outra viola a única e tenta de novo uma vez. "Sem mudança"
(US2 cenário 3): hash SHA-256 do `SavedCanvas` canonicalizado, comparado com o da última versão antes de
inserir.

## 3. Compartilhamento

Token de 32 bytes aleatórios (`crypto.randomUUID` ×2 ou `getRandomValues`, base64url) em
`savedDesigns.shareToken` (único, nullable). Um link por design; revogar = `null`; gerar de novo = token
novo. Link inexistente e revogado → mesma página "design não encontrado" (FR-008). A página
`/app/d/[token]` fica sob o layout de `/app` e chama `requireUserId` com retorno (gate 3).

## 4. Spoiler

Design com contexto de desafio: a página consulta `loadSolvedProblemIds(viewer)` (M2.8); se não
resolveu, mostra o aviso e só renderiza o canvas depois de "continuar" (estado no cliente — o aviso é de
cortesia, não segredo: o conteúdo é do dono, que escolheu compartilhar).

## 5. Validação do conteúdo salvo

A rota recebe `SavedCanvas` da API (pode ser forjado). Validação pura, parecida com a da submissão do
M2.8 mas aceitando rascunho: tipos conhecidos, réplicas 1–1000, `cacheHitRate` 0–1, posições finitas,
ids únicos, arestas entre nós existentes, toda aresta permitida pela matriz (inclusive Cliente →
componente), limites de tamanho; **não** exige entrada nem conexões.

## 6. Retorno pós-login (open redirect)

Hoje `/entrar` sempre manda pra `/app`. **Decisão**: `?voltar=` aceito só se for caminho interno que
começa com `/app/` e não contém `//`, `\` nem esquema — senão `/app`. Função pura testada com os casos
clássicos de bypass (`//evil.com`, `/\evil.com`, `https://…`, `/app/../..`).

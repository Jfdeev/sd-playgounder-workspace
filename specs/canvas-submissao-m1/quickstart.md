# Quickstart: M1 — Canvas e submissão

## Instalar dependências novas

```bash
pnpm --filter web add @xyflow/react zustand immer zundo
```

`packages/problems` é um pacote novo do monorepo (sem dependências externas) — depois de criado,
rodar `pnpm install` na raiz para linkar `@sdp/problems` em `apps/web` via `workspace:*` (mesmo
padrão usado para `@sdp/engine`, confirmado nesta sessão).

## Rodar localmente

```bash
pnpm --filter web dev
```

Abrir `http://localhost:3000/entrar`, logar (email/senha ou Google — M0.5), ser redirecionado para
`/app` → `/app/encurtador-de-url`.

## Verificar o loop principal (US1)

1. A tela mostra o enunciado do problema (FR-012) antes do canvas.
2. Arrastar um nó "Cliente" (mobile, web ou desktop) da paleta para o canvas.
3. Arrastar um "API Gateway" e um "App Server"; conectar Cliente → API Gateway → App Server.
4. Selecionar o App Server, abrir o painel de configuração, ajustar réplicas.
5. Clicar "submeter" — confirmar que o resultado mostra utilização, latência do caminho, custo, e
   nenhuma violação (design simples e válido).
6. Desconectar o App Server (deixando-o órfão) e submeter de novo — confirmar que a violação
   `orphan-node` aparece com mensagem legível (FR-016).

## Verificar undo/redo (US2)

Repetir uma sequência de edições, desfazer todas, refazer todas — o canvas deve voltar
exatamente ao estado anterior/seguinte a cada passo (FR-010).

## Verificar autosave (US3)

Montar um design parcial, recarregar a página (`F5`) — o design deve reaparecer idêntico
(FR-011). Abrir em uma aba anônima/outro perfil do navegador — o canvas deve estar vazio (nenhum
autosave compartilhado entre navegadores/dispositivos).

## Testes automatizados

```bash
pnpm --filter web test
pnpm --filter problems test
```

Cobertura esperada: `apps/web/src/lib/canvas-to-design.ts` e `packages/problems/src/catalog/**`
com testes fortes (research.md §8) — não há cobertura de componentes React/interação do canvas por
unit test, só verificação manual via os passos acima.

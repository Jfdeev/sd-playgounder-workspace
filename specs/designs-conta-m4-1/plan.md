# Implementation Plan: M4.1 — Designs na conta, histórico e compartilhamento

**Branch**: `feature/001-saved-designs-sharing` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

## Summary

Um design salvo é um registro nomeado da conta com **versões imutáveis**; cada versão guarda o canvas
inteiro (nós com posição, nós Cliente, arestas com tipo/peso, vínculo com arquitetura de referência),
num formato próprio (`SavedCanvas`) convertido de/para o estado do canvas por funções puras. Sem
transação no driver (`neon-http`), o número da versão nasce num único `INSERT … SELECT max+1` protegido
por uma restrição única `(designId, number)`; versão sem mudança é evitada comparando o hash do conteúdo
com o da última. Compartilhar é um token aleatório na própria linha do design (revogar = apagar o
token). O link abre `/app/d/[token]`, dentro do guard de sessão, em modo só-leitura com "Simular" e
"abrir uma cópia"; designs de desafio não resolvido mostram aviso de spoiler. O login ganha um parâmetro
de retorno validado contra *open redirect*. Engine, desafios, incidentes e XP não mudam.

## Technical Context

**Language/Version**: TypeScript 5.7 · **Dependencies**: nenhuma nova

**Storage**: Postgres (Neon) — **2 tabelas novas** (`savedDesigns`, `designVersions`) e **1 migração**
(`0005`), aplicada ao Neon live **só com autorização do autor** (dev = produção)

**Testing**: Vitest — funções puras em `apps/web/src/lib/designs/` (conversão canvas ↔ `SavedCanvas`,
validação do conteúdo salvo, hash de conteúdo, caminho de retorno seguro, serializador do design
compartilhado sem e-mail); rotas finas; UI no browser (`quickstart.md`)

**Constraints**: nada de outra conta sem link ativo (SC-003); sem e-mail do dono (SC-004); conteúdo
salvo validado no servidor (FR-010); resultado do engine igual antes/depois de salvar (SC-005); sem XP
(FR-011)

## Constitution Check

Engine intocado (I–VI); salvar não cria número nem nota (V); regras puras em `lib/designs`, banco em
`db/designs.ts` (VII). **Sem violação.**

## Project Structure

```text
specs/designs-conta-m4-1/  spec · plan · research · data-model · contracts/designs-api.md · quickstart · tasks

apps/web/src/
├── db/schema.ts                    # + savedDesigns, designVersions
├── db/migrations/0005_*.sql        # gate do autor
├── db/designs.ts                   # consultas/escritas (fora de src/lib — mesma regra do M2.8)
├── lib/designs/
│   ├── saved-canvas.ts             # SavedCanvas: canvas ↔ formato salvo; hash do conteúdo
│   ├── validate-saved-canvas.ts    # validação do conteúdo vindo da API (canvas parcial ok)
│   ├── shared-view.ts              # serializador do design compartilhado (nunca e-mail)
│   └── return-path.ts              # parâmetro de retorno do login, só caminhos internos /app/...
├── app/api/designs/route.ts                     # GET lista · POST cria (com a 1ª versão)
├── app/api/designs/[id]/route.ts                # GET (com versões) · PATCH nome · DELETE
├── app/api/designs/[id]/versions/route.ts       # POST nova versão
├── app/api/designs/[id]/share/route.ts          # POST gera link · DELETE revoga
├── app/app/d/[token]/page.tsx                   # visualização compartilhada (só leitura)
├── components/designs/                          # menu "Meus designs", salvar, histórico, viewer
└── stores/canvas-store.tsx                      # + openDesignId (design aberto no canvas)
```

## Gates antes do `/speckit-tasks`

**Decididos pelo autor em 2026-10-25**: 1 → migração autorizada; 2 → 50 designs / 100 versões; 3 →
retorno validado como proposto. Extra: a visão compartilhada mostra o apelido público do dono quando
ele tiver um e o perfil estiver visível (senão, anônimo).

1. **Migração `0005` no Neon live** — autorizada pelo autor na hora de aplicar.
2. **Limites por conta**: 50 designs e 100 versões por design (acima disso, salvar é recusado com
   mensagem; nada é apagado sozinho).
3. **Retorno pós-login**: `/entrar?voltar=/app/d/<token>` — só caminhos que começam com `/app/` (nada de
   `//`, `http`, `\`), o resto cai em `/app`.

## Fora de escopo

Galeria da comunidade, portfólio público, link por versão, edição colaborativa, export
(JSON/Mermaid/PNG), comparação visual entre versões.

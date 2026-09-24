# Quickstart: verificação manual — M2 — Avaliação e biblioteca

Mesmo gap já registrado nos marcos anteriores: `/app` exige sessão autenticada real, sem bypass de
dev — os passos abaixo exigem login manual no browser antes de seguir.

## US1 — Score por dimensão

1. Entrar no desafio "Encurtador de URL", montar um design que resolve a rubrica (App Server com
   réplicas suficientes + Cache + banco), Submeter.
2. Confirmar: painel de score mostra as 7 dimensões com valores diferentes de 0, nunca uma nota
   única agregada.
3. Remover o Cache do design, Submeter de novo. Confirmar: pelo menos a dimensão de Latência ou
   Custo muda de valor (prova que o score reage ao design).

## US2 — Narrador

1. Com um resultado já visível (US1), abrir o painel do narrador.
2. Confirmar: o texto aparece em até ~5s, menciona o gargalo/latência/custo já visíveis no painel
   de resultado, nenhum número no texto diverge do que já está na tela.
3. Recarregar a página, submeter exatamente o mesmo design de novo, abrir o narrador de novo.
   Confirmar (via Network tab do browser ou log do servidor): resposta veio do cache
   (`cached: true`), sem nova chamada à API do Gemini.

## US3 — Solução de referência

1. Dentro de um desafio, abrir a solução de referência.
2. Confirmar: um design completo aparece (carregável), com texto de raciocínio associado a pelo
   menos a decisão de capacidade principal do problema.
3. Carregar esse design no canvas e Submeter — confirmar que passa em 100% da rubrica daquele
   problema.

## US4 — Calculadora de capacidade

1. No sandbox (sem desafio ativo), abrir a calculadora na topbar de utilitários.
2. Informar DAU/requisições por usuário/dia/pico iguais aos do Encurtador de URL
   (`packages/problems/src/catalog/url-shortener.ts`, campo `scale`).
3. Confirmar: RPS médio/pico calculados batem com o que `toWorkload()` calcularia pro mesmo
   problema (comparar com o resultado de "Simular" nesse mesmo desafio, mesma escala).

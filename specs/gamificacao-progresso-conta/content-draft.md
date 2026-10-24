# Rascunho de conteúdo — M2.8 — aguardando aprovação do autor

> **Gate**: números e regras propostos; nada disso vira código antes da sua aprovação. A spec fixa as
> regras (verificável, determinístico, sem nota agregada); aqui ficam os valores. Restrição real: o
> catálogo tem **3 desafios** hoje (M2), e o M4 é que o amplia para 12.

## 1. XP por evento

| evento | XP | observação |
|---|---|---|
| resolver um desafio pela 1ª vez | **100** | igual para os 3 (o `Problem` não tem campo de dificuldade) |
| desbloquear uma conquista | **0** | conquista é reconhecimento, não fonte de XP — evita XP "em cascata" |
| resolver de novo / reenviar | 0 | idempotente (FR-003) |

## 2. Curva de níveis

Nível `L` começa em `100 × (L−1) × L / 2` XP — cada nível pede 100 XP a mais que o anterior:

| nível | XP mínimo | falta pro próximo |
|---|---|---|
| 1 | 0 | 100 |
| 2 | 100 | 200 |
| 3 | 300 | 300 |
| 4 | 600 | 400 |
| 5 | 1000 | 500 |

Com os 3 desafios de hoje (300 XP), o teto prático é o **nível 3**; o M4 (12 desafios = 1.200 XP)
leva até o nível 5.

## 3. Apelido

- 3 a 20 caracteres; só `a–z`, `0–9` e `_`; começa com letra.
- Guardado em minúsculas (digitar `Joao_Dev` vira `joao_dev`) — único sem diferenciar maiúsculas.
- Pode ser trocado; o antigo fica livre na hora.
- Sem lista de palavras reservadas: o perfil fica em `/app/u/<apelido>`, então nenhum apelido colide
  com rota.

## 4. Ofensiva — o que conta como "dia com atividade verificada" (**escolha uma**)

| opção | conta pro dia | efeito |
|---|---|---|
| **A** | qualquer submissão que o servidor reexecutou, resolvendo ou não | a ofensiva funciona hoje (dá pra estudar todo dia mesmo com 3 desafios); não dá XP, então não vira farming de nível — o limite de taxa (§5) segura abuso |
| **B** | só resolver um desafio (inclusive de novo, sem XP) | exige resolver algo todo dia; com 3 desafios vira "resolver de novo o mesmo" |
| **C** | só a 1ª resolução (a que dá XP) | máximo de 3 dias de ofensiva na vida até o M4 ampliar o catálogo |

Recomendação: **A** — é a única em que a ofensiva mede hábito de estudo com o catálogo atual, e
continua verificável (o servidor rodou o engine sobre um design válido).

## 5. Limite de taxa

10 submissões por minuto por usuário; acima disso a submissão não é registrada (o resultado local
continua aparecendo).

## 6. Conquistas iniciais

Todas verificáveis pelo servidor, cada uma desbloqueia uma vez:

| id | nome | condição |
|---|---|---|
| `first-challenge` | Primeiro desafio | resolver qualquer desafio |
| `all-challenges` | Catálogo completo | ter resolvido todos os desafios do catálogo atual |
| `no-spof` | Sem ponto único de falha | resolver um desafio com um design sem nenhuma violação de SPOF no resultado do servidor |
| `streak-3` | 3 dias seguidos | ofensiva chegar a 3 |
| `streak-7` | Uma semana | ofensiva chegar a 7 |

Se a ofensiva ficar na opção C (§4), `streak-7` é inalcançável até o M4 e eu tiro ela da lista.

## 7. Desempate do ranking

XP decrescente → quem chegou nesse XP primeiro (data do último evento com XP, crescente) → apelido
em ordem alfabética.

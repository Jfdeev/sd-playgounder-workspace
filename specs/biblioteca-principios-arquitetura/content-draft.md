# Rascunho de conteúdo — M2.7 (aguardando aprovação do autor)

> **Gate (FR-006)**: este texto foi rascunhado por LLM **sem acesso aos livros**. Nada daqui entra em
> código antes de o autor aprovar. Citação só no nível obra + autor (FR-007). Marque o que quiser
> cortar ou reescrever; o que não for marcado e for aprovado vira o conteúdo literal de
> `packages/knowledge`.
>
> Confiança por grupo: **Fowler** parte da descrição oficial do catálogo dele (alta) · **Clean
> Architecture** é redação minha (confira, principalmente a "relação com a topologia") ·
> **Richards & Ford** parte de resumos de terceiros (confira contra o cap. 4).

## 1. Clean Architecture — Robert C. Martin

Cada entrada tem `topology`: `analogia` (há um paralelo com a topologia que a plataforma desenha — a
plataforma **não calcula** o princípio) ou `nenhuma` (é de nível de código/classe).

### Princípios de design (SOLID)

**`srp` — Princípio da Responsabilidade Única (SRP)**
Um módulo deve ter uma, e apenas uma, razão para mudar — ou seja, responder a um único ator (grupo
de interesse). Quando um módulo atende vários atores, a mudança pedida por um quebra o que o outro
usa.
*Topologia — analogia*: o mesmo raciocínio aparece na infraestrutura. Um componente que acumula
papéis (limitar tráfego, decidir, guardar) muda por muitos motivos; separá-los em nós distintos
(Rate Limiter → App Server → Store) isola cada motivo. É um paralelo: a plataforma não mede SRP.

**`ocp` — Princípio Aberto/Fechado (OCP)**
Um artefato de software deve estar aberto para extensão e fechado para modificação: comportamento
novo entra como código novo, sem editar o que já funciona.
*Topologia — analogia*: no template Orientado a Eventos, um novo consumidor entra sem o produtor
mudar — a extensão acontece fora do componente existente. É um paralelo, não uma medição.

**`lsp` — Princípio da Substituição de Liskov (LSP)**
Onde um tipo base é esperado, qualquer subtipo deve poder entrar no lugar sem quebrar o
comportamento que quem usa o tipo base espera.
*Topologia — nenhuma*: é uma regra de nível de classe/interface. Não existe correspondente na
topologia que a plataforma simula.

**`isp` — Princípio da Segregação de Interfaces (ISP)**
Nenhum cliente deve ser forçado a depender de operações que não usa; é melhor várias interfaces
pequenas e específicas do que uma grande e genérica.
*Topologia — nenhuma*: é uma regra de nível de interface de código. A plataforma não modela a
granularidade de interfaces.

**`dip` — Princípio da Inversão de Dependência (DIP)**
Módulos de alto nível (a regra de negócio) não devem depender de módulos de baixo nível (detalhes);
ambos devem depender de abstrações — e as abstrações não dependem de detalhes.
*Topologia — analogia*: isolar uma dependência volátil atrás de uma borda própria (como o Payment,
um serviço externo lento, separado do App Server) tem o mesmo espírito. É um paralelo: o princípio
trata de dependência de código-fonte, não de fluxo de requisição.

### Arquitetura

**`dependency-rule` — A Regra de Dependência**
Dependências de código-fonte só apontam para dentro: as políticas de mais alto nível (regras de
negócio) não sabem nada dos detalhes mais externos (banco, web, frameworks); os detalhes é que
dependem das políticas.
*Topologia — analogia*: a direção da **dependência** não é a direção do **fluxo da requisição** —
uma requisição atravessa App Server e banco, mas é o código do App Server que não deve conhecer o
banco específico. Não confundir as duas setas no canvas.

**`boundaries` — Fronteiras**
Uma fronteira é uma linha que separa o que importa (as regras de negócio) do que é detalhe, e
controla em que direção as dependências a cruzam. Traçá-las cedo é o que mantém detalhes
substituíveis.
*Topologia — analogia*: uma fronteira de serviço ou de rede (como entre microsserviços) é uma
forma concreta de fronteira — com custo de latência e de operação. É um paralelo; a plataforma
simula o custo, não julga onde a fronteira deveria estar.

**`database-is-a-detail` — O banco de dados é um detalhe**
O modelo de dados importa para a arquitetura, mas o mecanismo de armazenamento é um detalhe: a regra
de negócio não deve depender de qual banco guarda os dados.
*Topologia — analogia*: o canvas coloca o banco como um nó central do desenho — o que é
legítimo para dimensionar capacidade e custo. O princípio fala de **dependência de código**; a
plataforma não o contradiz nem o mede.

**`frameworks-are-details` — Frameworks são detalhes**
Um framework é uma ferramenta que você usa, não uma arquitetura com a qual você se casa: mantenha-o
na borda e a regra de negócio independente dele.
*Topologia — nenhuma*: é uma regra de organização de código; não há correspondente na topologia.

## 2. Características de arquitetura — Mark Richards & Neal Ford

Todas com a nota fixa: **a plataforma não calcula esta característica** (ela não é uma das 7
dimensões de score). Definições partem de resumos de terceiros do cap. 4 — confira.

### Operacionais

**`continuity` — Continuidade**: capacidade do sistema de manter ou retomar a operação do negócio
após um desastre — o que inclui ter um plano de recuperação.
**`recoverability` — Recuperabilidade**: quão rápido o negócio volta a operar depois de uma falha
grave (por exemplo, quanto tempo leva restaurar a partir de backup).
**`reliability-safety` — Confiabilidade / segurança operacional**: o sistema precisa se comportar
corretamente e falhar de forma segura quando uma falha custa muito — dinheiro, ou até vidas.
**`robustness` — Robustez**: capacidade de lidar com erros e condições adversas em execução (queda de
rede, falta de energia, hardware com falha) sem deixar de funcionar de forma aceitável.

### Estruturais

**`configurability` — Configurabilidade**: facilidade de o usuário final ajustar a configuração do
software, sem alterar código.
**`extensibility` — Extensibilidade**: facilidade de acrescentar novas funcionalidades.
**`installability` — Instalabilidade**: facilidade de instalar o sistema nas plataformas necessárias.
**`leverageability` — Reaproveitamento**: capacidade de reutilizar componentes comuns entre produtos
ou partes do sistema.
**`localization` — Localização**: suporte a vários idiomas, formatos de data, moedas e convenções
locais.
**`maintainability` — Manutenibilidade**: facilidade de aplicar mudanças e corrigir problemas no
sistema.
**`portability` — Portabilidade**: capacidade de o sistema rodar em mais de uma plataforma.
**`supportability` — Suportabilidade**: quanto de suporte técnico a aplicação exige — o quanto de
log e de ferramenta de depuração é necessário para diagnosticar problemas.
**`upgradeability` — Atualizabilidade**: facilidade de atualizar versões já instaladas do sistema.

### Transversais

**`accessibility` — Acessibilidade**: o sistema ser utilizável por todos, incluindo pessoas com
deficiência.
**`archivability` — Arquivabilidade**: os dados poderem ser arquivados ou apagados depois de um
período, conforme a necessidade do negócio.
**`authentication` — Autenticação**: garantir que quem usa o sistema é quem diz ser. *Na plataforma,
é coberta pela dimensão Segurança.*
**`authorization` — Autorização**: garantir que cada usuário só acessa o que tem permissão de
acessar. *Na plataforma, é coberta pela dimensão Segurança.*
**`legal` — Legal**: restrições legais e regulatórias a que o sistema precisa obedecer (proteção de
dados, retenção, jurisdição).
**`privacy` — Privacidade**: proteger os dados dos usuários de acesso e exposição indevidos,
inclusive dentro da própria organização.

## 3. Padrões de Fowler — *Patterns of Enterprise Application Architecture* (leitura recomendada)

Todos com a nota fixa: **leitura recomendada — não é um componente do canvas nem algo que o engine
calcula**. Definições partem da descrição oficial de uma linha do catálogo do Fowler
(martinfowler.com/eaaCatalog), em português.

**`service-layer` — Service Layer** *(Lógica de domínio)*: define a fronteira de uma aplicação com
uma camada de serviços que estabelece o conjunto de operações disponíveis e coordena a resposta da
aplicação em cada uma.
**`data-mapper` — Data Mapper** *(Fonte de dados)*: uma camada de mapeadores que move dados entre
objetos e um banco de dados, mantendo os dois independentes um do outro e do próprio mapeador.
**`repository` — Repository** *(Mapeamento objeto-relacional)*: faz a mediação entre o domínio e a
camada de mapeamento de dados usando uma interface parecida com uma coleção para acessar objetos de
domínio.
**`remote-facade` — Remote Facade** *(Distribuição)*: oferece uma fachada de granularidade grossa
sobre objetos de granularidade fina para melhorar a eficiência numa rede.
**`data-transfer-object` — Data Transfer Object** *(Distribuição)*: um objeto que carrega dados entre
processos para reduzir o número de chamadas de método.
**`optimistic-offline-lock` — Optimistic Offline Lock** *(Concorrência offline)*: previne conflitos
entre transações de negócio concorrentes detectando o conflito e desfazendo a transação.
**`pessimistic-offline-lock` — Pessimistic Offline Lock** *(Concorrência offline)*: previne conflitos
entre transações de negócio concorrentes permitindo que apenas uma transação por vez acesse os dados.
**`client-session-state` — Client Session State** *(Estado de sessão)*: guarda o estado da sessão no
cliente.
**`server-session-state` — Server Session State** *(Estado de sessão)*: mantém o estado da sessão
num servidor, de forma serializada.
**`database-session-state` — Database Session State** *(Estado de sessão)*: guarda os dados de sessão
como dados confirmados no banco de dados.
**`gateway` — Gateway** *(Padrões base)*: um objeto que encapsula o acesso a um sistema ou recurso
externo.

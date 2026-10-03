import type { LibraryEntry } from '../library.js';
import { CLEAN_ARCHITECTURE } from '../source.js';

const SOLID = 'Princípios de design (SOLID)';
const ARQUITETURA = 'Arquitetura';

/** Conteúdo aprovado pelo autor em 2026-10-03 (specs/biblioteca-principios-arquitetura/content-draft.md §1). */
export const CLEAN_ARCHITECTURE_ENTRIES: readonly LibraryEntry[] = [
  {
    id: 'srp',
    category: 'clean-architecture',
    group: SOLID,
    name: 'Princípio da Responsabilidade Única (SRP)',
    definition:
      'Um módulo deve ter uma, e apenas uma, razão para mudar — ou seja, responder a um único ator ' +
      '(grupo de interesse). Quando um módulo atende vários atores, a mudança pedida por um quebra o ' +
      'que o outro usa.',
    source: CLEAN_ARCHITECTURE,
    topology: {
      relation: 'analogia',
      note:
        'O mesmo raciocínio aparece na infraestrutura. Um componente que acumula papéis (limitar ' +
        'tráfego, decidir, guardar) muda por muitos motivos; separá-los em nós distintos (Rate Limiter ' +
        '→ App Server → Store) isola cada motivo. É um paralelo: a plataforma não mede SRP.',
    },
  },
  {
    id: 'ocp',
    category: 'clean-architecture',
    group: SOLID,
    name: 'Princípio Aberto/Fechado (OCP)',
    definition:
      'Um artefato de software deve estar aberto para extensão e fechado para modificação: ' +
      'comportamento novo entra como código novo, sem editar o que já funciona.',
    source: CLEAN_ARCHITECTURE,
    topology: {
      relation: 'analogia',
      note:
        'No template Orientado a Eventos, um novo consumidor entra sem o produtor mudar — a extensão ' +
        'acontece fora do componente existente. É um paralelo, não uma medição.',
    },
  },
  {
    id: 'lsp',
    category: 'clean-architecture',
    group: SOLID,
    name: 'Princípio da Substituição de Liskov (LSP)',
    definition:
      'Onde um tipo base é esperado, qualquer subtipo deve poder entrar no lugar sem quebrar o ' +
      'comportamento que quem usa o tipo base espera.',
    source: CLEAN_ARCHITECTURE,
    topology: {
      relation: 'nenhuma',
      note:
        'É uma regra de nível de classe/interface. Não existe correspondente na topologia que a ' +
        'plataforma simula.',
    },
  },
  {
    id: 'isp',
    category: 'clean-architecture',
    group: SOLID,
    name: 'Princípio da Segregação de Interfaces (ISP)',
    definition:
      'Nenhum cliente deve ser forçado a depender de operações que não usa; é melhor várias ' +
      'interfaces pequenas e específicas do que uma grande e genérica.',
    source: CLEAN_ARCHITECTURE,
    topology: {
      relation: 'nenhuma',
      note:
        'É uma regra de nível de interface de código. A plataforma não modela a granularidade de ' +
        'interfaces.',
    },
  },
  {
    id: 'dip',
    category: 'clean-architecture',
    group: SOLID,
    name: 'Princípio da Inversão de Dependência (DIP)',
    definition:
      'Módulos de alto nível (a regra de negócio) não devem depender de módulos de baixo nível ' +
      '(detalhes); ambos devem depender de abstrações — e as abstrações não dependem de detalhes.',
    source: CLEAN_ARCHITECTURE,
    topology: {
      relation: 'analogia',
      note:
        'Isolar uma dependência volátil atrás de uma borda própria (como o Payment, um serviço ' +
        'externo lento, separado do App Server) tem o mesmo espírito. É um paralelo: o princípio trata ' +
        'de dependência de código-fonte, não de fluxo de requisição.',
    },
  },
  {
    id: 'dependency-rule',
    category: 'clean-architecture',
    group: ARQUITETURA,
    name: 'A Regra de Dependência',
    definition:
      'Dependências de código-fonte só apontam para dentro: as políticas de mais alto nível (regras ' +
      'de negócio) não sabem nada dos detalhes mais externos (banco, web, frameworks); os detalhes é ' +
      'que dependem das políticas.',
    source: CLEAN_ARCHITECTURE,
    topology: {
      relation: 'analogia',
      note:
        'A direção da dependência não é a direção do fluxo da requisição — uma requisição atravessa ' +
        'App Server e banco, mas é o código do App Server que não deve conhecer o banco específico. ' +
        'Não confundir as duas setas no canvas.',
    },
  },
  {
    id: 'boundaries',
    category: 'clean-architecture',
    group: ARQUITETURA,
    name: 'Fronteiras',
    definition:
      'Uma fronteira é uma linha que separa o que importa (as regras de negócio) do que é detalhe, e ' +
      'controla em que direção as dependências a cruzam. Traçá-las cedo é o que mantém detalhes ' +
      'substituíveis.',
    source: CLEAN_ARCHITECTURE,
    topology: {
      relation: 'analogia',
      note:
        'Uma fronteira de serviço ou de rede (como entre microsserviços) é uma forma concreta de ' +
        'fronteira — com custo de latência e de operação. É um paralelo; a plataforma simula o custo, ' +
        'não julga onde a fronteira deveria estar.',
    },
  },
  {
    id: 'database-is-a-detail',
    category: 'clean-architecture',
    group: ARQUITETURA,
    name: 'O banco de dados é um detalhe',
    definition:
      'O modelo de dados importa para a arquitetura, mas o mecanismo de armazenamento é um detalhe: ' +
      'a regra de negócio não deve depender de qual banco guarda os dados.',
    source: CLEAN_ARCHITECTURE,
    topology: {
      relation: 'analogia',
      note:
        'O canvas coloca o banco como um nó central do desenho — o que é legítimo para dimensionar ' +
        'capacidade e custo. O princípio fala de dependência de código; a plataforma não o contradiz ' +
        'nem o mede.',
    },
  },
  {
    id: 'frameworks-are-details',
    category: 'clean-architecture',
    group: ARQUITETURA,
    name: 'Frameworks são detalhes',
    definition:
      'Um framework é uma ferramenta que você usa, não uma arquitetura com a qual você se casa: ' +
      'mantenha-o na borda e a regra de negócio independente dele.',
    source: CLEAN_ARCHITECTURE,
    topology: {
      relation: 'nenhuma',
      note: 'É uma regra de organização de código; não há correspondente na topologia.',
    },
  },
];

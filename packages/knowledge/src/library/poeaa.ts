import type { LibraryEntry } from '../library.js';
import { PATTERNS_OF_ENTERPRISE_APPLICATION_ARCHITECTURE } from '../source.js';

const READING_ONLY = 'Leitura recomendada — não é um componente do canvas nem algo que o engine calcula.';

function pattern(id: string, group: string, name: string, definition: string): LibraryEntry {
  return {
    id,
    category: 'poeaa',
    group,
    name,
    definition,
    source: PATTERNS_OF_ENTERPRISE_APPLICATION_ARCHITECTURE,
    platformNote: READING_ONLY,
  };
}

/**
 * Conteúdo aprovado pelo autor em 2026-10-03 (specs/biblioteca-principios-arquitetura/content-draft.md
 * §3). Definições = descrição oficial de uma linha do catálogo do Fowler
 * (martinfowler.com/eaaCatalog), em português; o grupo é a categoria do próprio catálogo.
 */
export const POEAA_ENTRIES: readonly LibraryEntry[] = [
  pattern(
    'service-layer',
    'Lógica de domínio',
    'Service Layer',
    'Define a fronteira de uma aplicação com uma camada de serviços que estabelece o conjunto de ' +
      'operações disponíveis e coordena a resposta da aplicação em cada uma.',
  ),
  pattern(
    'data-mapper',
    'Arquitetura de fonte de dados',
    'Data Mapper',
    'Uma camada de mapeadores que move dados entre objetos e um banco de dados, mantendo os dois ' +
      'independentes um do outro e do próprio mapeador.',
  ),
  pattern(
    'repository',
    'Mapeamento objeto-relacional',
    'Repository',
    'Faz a mediação entre o domínio e a camada de mapeamento de dados usando uma interface parecida ' +
      'com uma coleção para acessar objetos de domínio.',
  ),
  pattern(
    'remote-facade',
    'Distribuição',
    'Remote Facade',
    'Oferece uma fachada de granularidade grossa sobre objetos de granularidade fina para melhorar a ' +
      'eficiência numa rede.',
  ),
  pattern(
    'data-transfer-object',
    'Distribuição',
    'Data Transfer Object',
    'Um objeto que carrega dados entre processos para reduzir o número de chamadas de método.',
  ),
  pattern(
    'optimistic-offline-lock',
    'Concorrência offline',
    'Optimistic Offline Lock',
    'Previne conflitos entre transações de negócio concorrentes detectando o conflito e desfazendo a ' +
      'transação.',
  ),
  pattern(
    'pessimistic-offline-lock',
    'Concorrência offline',
    'Pessimistic Offline Lock',
    'Previne conflitos entre transações de negócio concorrentes permitindo que apenas uma transação ' +
      'por vez acesse os dados.',
  ),
  pattern('client-session-state', 'Estado de sessão', 'Client Session State', 'Guarda o estado da sessão no cliente.'),
  pattern(
    'server-session-state',
    'Estado de sessão',
    'Server Session State',
    'Mantém o estado da sessão num servidor, de forma serializada.',
  ),
  pattern(
    'database-session-state',
    'Estado de sessão',
    'Database Session State',
    'Guarda os dados de sessão como dados confirmados no banco de dados.',
  ),
  pattern(
    'gateway',
    'Padrões base',
    'Gateway',
    'Um objeto que encapsula o acesso a um sistema ou recurso externo.',
  ),
];

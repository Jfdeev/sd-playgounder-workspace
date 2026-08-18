/**
 * Catálogo de apresentação do canvas — apps/web/src/lib/canvas-ui-catalog.ts
 *
 * Ícone + rótulo por `ComponentType`/`ClientVariant`/`EdgeKind`. Puramente visual — nenhum valor
 * aqui é lido pelo engine ou pelo mapper (`canvas-to-design.ts`). Compartilhado entre a paleta
 * (`palette.tsx`) e os nós/arestas renderizados no canvas, para nunca duplicar rótulo/ícone entre
 * os dois lugares.
 */

import {
  Boxes,
  Cloud,
  Cog,
  Database,
  DatabaseZap,
  DoorOpen,
  Globe,
  HardDrive,
  ListOrdered,
  Monitor,
  Server,
  Shuffle,
  Smartphone,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { ComponentType, EdgeKind } from '@sdp/engine';
import type { ClientVariant } from './canvas-types';

export const COMPONENT_UI: Record<ComponentType, { label: string; icon: LucideIcon; description: string }> = {
  load_balancer: {
    label: 'Load Balancer',
    icon: Shuffle,
    description:
      'Distribui as requisições recebidas entre várias réplicas de um mesmo serviço, evitando sobrecarregar uma só. Estratégias comuns: round robin (alterna em sequência), least connections (manda pra réplica com menos requisições em andamento) e hashing (mesma origem sempre cai na mesma réplica). O algoritmo escolhido não é modelado pelo engine — o cálculo usa a capacidade agregada das réplicas. Só conecta a componentes de computação (App Server, Worker).',
  },
  api_gateway: {
    label: 'API Gateway',
    icon: DoorOpen,
    description:
      'Porta de entrada única da API: roteia cada requisição pro serviço certo. É o lugar típico pra autenticação, rate limiting e agregação de respostas — recursos que este simulador ainda não modela. Só conecta a componentes de computação (App Server, Worker).',
  },
  app_server: {
    label: 'App Server',
    icon: Server,
    description:
      'Onde a lógica de negócio roda: recebe a requisição, consulta ou atualiza dados e devolve a resposta. É o componente mais versátil do canvas — conecta a cache, aos três tipos de banco, a fila e a object storage.',
  },
  worker: {
    label: 'Worker',
    icon: Cog,
    description:
      'Processa tarefas em segundo plano, tipicamente consumidas de uma fila — a ligação Fila → Worker é assíncrona, então a resposta ao usuário não espera o worker terminar. Grava o resultado num banco, cache, object storage, ou publica numa próxima fila.',
  },
  cache: {
    label: 'Cache',
    icon: Zap,
    description:
      'Guarda respostas frequentes em memória pra evitar recalcular ou reconsultar o banco. A taxa de acerto (hit rate) configurada no painel é o que o engine de fato usa: quanto maior, menos carga chega no banco atrás dele — por isso o Cache precisa de uma aresta de saída pra um banco, senão a carga de miss não tem pra onde ir.',
  },
  sql_primary: {
    label: 'SQL Primary',
    icon: Database,
    description:
      'Banco relacional que recebe as escritas. Pode replicar pra uma ou mais SQL Replica (aresta de replicação) pra distribuir leituras e reduzir o risco de SPOF.',
  },
  sql_replica: {
    label: 'SQL Replica',
    icon: DatabaseZap,
    description:
      'Cópia somente-leitura de um SQL Primary, alimentada por replicação — não recebe escrita direta. Reduz a carga de leitura no primary e ajuda contra SPOF se o primary cair.',
  },
  nosql_kv: {
    label: 'NoSQL (KV)',
    icon: Boxes,
    description:
      'Banco chave-valor, otimizado pra leituras/escritas muito rápidas em alta escala, sem consultas relacionais complexas. Bom pra sessões, contadores, ou qualquer dado acessado só pela chave.',
  },
  queue: {
    label: 'Fila',
    icon: ListOrdered,
    description:
      'Desacopla quem produz trabalho de quem processa: um produtor publica uma mensagem e segue em frente sem esperar o processamento terminar. Só entrega pra um Worker — é a aresta assíncrona clássica, que tira o processamento do caminho crítico de latência do usuário.',
  },
  object_storage: {
    label: 'Object Storage',
    icon: HardDrive,
    description:
      'Armazenamento de arquivos grandes e não-estruturados (imagens, vídeos, backups) a custo baixo. Não é feito pra consulta — só pra guardar e servir o arquivo pelo identificador.',
  },
  cdn: {
    label: 'CDN',
    icon: Cloud,
    description:
      'Rede de servidores geograficamente distribuídos que guarda cópias de conteúdo estático perto do usuário, reduzindo latência. Quando falta na borda, busca na origem — Object Storage (estático) ou App Server (dinâmico).',
  },
};

export const CLIENT_UI: Record<ClientVariant, { label: string; icon: LucideIcon; description: string }> = {
  mobile: {
    label: 'Cliente (mobile)',
    icon: Smartphone,
    description:
      'Cliente mobile (app nativo ou híbrido) — ponto de entrada de carga no canvas. Todo componente ligado diretamente a ele vira uma porta de entrada da requisição na simulação (FR-006).',
  },
  web: {
    label: 'Cliente (web)',
    icon: Globe,
    description:
      'Cliente web (navegador) — ponto de entrada de carga no canvas. Todo componente ligado diretamente a ele vira uma porta de entrada da requisição na simulação (FR-006).',
  },
  desktop: {
    label: 'Cliente (desktop)',
    icon: Monitor,
    description:
      'Cliente desktop (aplicativo instalado) — ponto de entrada de carga no canvas. Todo componente ligado diretamente a ele vira uma porta de entrada da requisição na simulação (FR-006).',
  },
};

export const EDGE_KIND_UI: Record<EdgeKind, { label: string; colorClass: string; dashed: boolean }> = {
  read: { label: 'Leitura', colorClass: 'stroke-cyan-400', dashed: false },
  write: { label: 'Escrita', colorClass: 'stroke-pink-400', dashed: false },
  async: { label: 'Assíncrona', colorClass: 'stroke-amber-400', dashed: true },
  replication: { label: 'Replicação', colorClass: 'stroke-violet-400', dashed: false },
};

export const NODE_STATUS_UI: Record<'healthy' | 'warning' | 'saturated', { label: string; colorClass: string }> = {
  healthy: { label: 'Saudável', colorClass: 'border-emerald-500 text-emerald-400' },
  warning: { label: 'Atenção', colorClass: 'border-amber-500 text-amber-400' },
  saturated: { label: 'Saturado', colorClass: 'border-red-500 text-red-400' },
};

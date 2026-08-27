/**
 * Catálogo de apresentação do canvas — apps/web/src/lib/canvas-ui-catalog.ts
 *
 * Ícone + rótulo por `ComponentType`/`ClientVariant`/`EdgeKind`. Puramente visual — nenhum valor
 * aqui é lido pelo engine ou pelo mapper (`canvas-to-design.ts`). Compartilhado entre a paleta
 * (`palette.tsx`) e os nós/arestas renderizados no canvas, para nunca duplicar rótulo/ícone entre
 * os dois lugares.
 */

import {
  Bell,
  Bot,
  Boxes,
  BarChart3,
  Brain,
  CalendarClock,
  Cloud,
  Cog,
  Container,
  Cpu,
  CreditCard,
  Database,
  DatabaseZap,
  DoorOpen,
  Fingerprint,
  Gauge,
  Globe,
  HardDrive,
  HeartPulse,
  KeyRound,
  Layers,
  LineChart,
  ListOrdered,
  Lock,
  Mail,
  Monitor,
  Network,
  Radar,
  Radio,
  Route,
  Router,
  Rss,
  ScrollText,
  SearchCode,
  Server,
  ShieldAlert,
  ShieldCheck,
  Shuffle,
  Siren,
  Smartphone,
  Warehouse,
  Waves,
  Waypoints,
  Webhook,
  Workflow,
  Wrench,
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

  // Traffic & Edge novos — M1.5 US2.
  dns: {
    label: 'DNS',
    icon: Radar,
    description:
      'Resolve o nome de domínio pra um endereço IP — o primeiro salto de toda requisição, antes mesmo do TCP/HTTP começarem. Encadeia com os outros componentes de borda (WAF, Rate Limiter, Ingress) ou vai direto pros componentes que já processam requisição (Load Balancer, API Gateway, App Server).',
  },
  waf: {
    label: 'WAF',
    icon: ShieldAlert,
    description:
      'Web Application Firewall: inspeciona o conteúdo da requisição e barra padrões maliciosos conhecidos (SQL injection, XSS, bots) antes de chegar na aplicação. Fica na borda, junto com DNS/Rate Limiter/Ingress — nunca conecta direto a dado, cache ou fila.',
  },
  ingress: {
    label: 'Ingress',
    icon: Waypoints,
    description:
      'Controlador de entrada de um cluster Kubernetes: roteia requisições externas pros serviços internos certos, baseado em host/path. Cumpre um papel parecido com Load Balancer/API Gateway, mas é especificamente a peça de borda de um cluster K8s.',
  },
  rate_limiter: {
    label: 'Rate Limiter',
    icon: Gauge,
    description:
      'Rejeita requisições acima de um limite configurado (ex. por IP, por chave de API), protegendo o resto do sistema de um pico de tráfego ou abuso. Trabalho leve e rápido — verificação de contador, não processamento de negócio.',
  },

  // Compute novos — M1.5 US2. Todos variações de App Server no grafo: mesmo leque de destino
  // (cache, bancos, fila, object storage, e agora também os sinks/External novos).
  serverless: {
    label: 'Serverless',
    icon: Cpu,
    description:
      'Função que escala automaticamente por requisição, sem servidor dedicado pra manter — mas paga o preço de "cold start" (a primeira chamada depois de um período ocioso é bem mais lenta, refletido na latência p99 alta). Custo varia por invocação, não por instância fixa.',
  },
  auth_service: {
    label: 'Auth Service',
    icon: KeyRound,
    description:
      'Emite e valida identidade — login, sessão, token JWT, fluxo OAuth. Toda operação sensível do sistema depende dele estar disponível e rápido, já que costuma ficar no caminho crítico de quase toda requisição autenticada.',
  },
  search: {
    label: 'Search',
    icon: SearchCode,
    description:
      'Motor de busca full-text (ex. Elasticsearch/OpenSearch) — indexa documentos e responde consultas de texto livre com relevância, algo que um banco relacional comum não faz bem. Mais lento que uma consulta por chave, porque compara contra um índice inteiro.',
  },
  scheduler: {
    label: 'Scheduler',
    icon: CalendarClock,
    description:
      'Dispara jobs periódicos (estilo cron) — limpeza de dados antigos, geração de relatório noturno, sincronização agendada. Baixo volume de chamada (não está no caminho da requisição do usuário final), mas ainda participa da simulação como qualquer outro nó.',
  },
  notifications: {
    label: 'Notifications',
    icon: Bell,
    description:
      'Envia push, SMS ou notificação in-app pro usuário final. Tipicamente é quem aciona o Email (ex. "sua compra foi confirmada") — por isso alcança External na matriz de conectividade, junto com os outros componentes de cômputo.',
  },
  analytics: {
    label: 'Analytics',
    icon: BarChart3,
    description:
      'Coleta e agrega eventos de produto/uso (cliques, conversões, sessões) pra alimentar dashboards e decisões de negócio. Escreve tipicamente num Data Warehouse — um destino que a maioria dos outros componentes de cômputo também alcança, mas que faz mais sentido aqui.',
  },

  // Storage novos — M1.5 US2. Sempre folha, como SQL Replica/NoSQL/Object Storage.
  data_warehouse: {
    label: 'Data Warehouse',
    icon: Warehouse,
    description:
      'Banco analítico colunar, otimizado pra consultas agregadas pesadas sobre grandes volumes (ex. "receita por região no último trimestre") — não pra volume alto de transações pequenas, por isso sua capacidade de throughput é bem menor que a de um banco OLTP como o SQL Primary. Sempre um destino final, nunca origina conexão.',
  },
  vector_db: {
    label: 'Vector DB',
    icon: Fingerprint,
    description:
      'Guarda embeddings (representações numéricas de significado) e busca por similaridade — a peça de dado por trás de RAG (retrieval-augmented generation) e busca semântica. Pode até ficar atrás de um Cache (miss path plausível pra uma busca já feita antes), mas nunca origina conexão.',
  },

  // Messaging novos — M1.5 US2. Só entregam pra Worker, mesma regra de Fila → Worker.
  pubsub: {
    label: 'Pub/Sub',
    icon: Rss,
    description:
      'Difunde um evento publicado pra N assinantes independentes, sem que o publicador saiba quem (ou quantos) vai consumir. Diferente de uma Fila (1 mensagem, 1 consumidor que a remove), aqui vários Workers podem reagir ao mesmo evento.',
  },
  event_stream: {
    label: 'Event Stream',
    icon: Radio,
    description:
      'Log ordenado e replayable de eventos — um consumidor pode reprocessar desde um ponto passado, não só consumir o que chega dali pra frente. Suporta throughput bem mais alto que uma fila tradicional, por isso sua capacidade fica na mesma ordem de grandeza de um CDN.',
  },
  kafka: {
    label: 'Kafka',
    icon: Waves,
    description:
      'Plataforma de streaming distribuída de altíssimo throughput — o caso mais extremo de Event Stream, usado quando o volume de eventos é grande demais pra uma fila ou pub/sub convencional dar conta.',
  },

  // AI & Agents — M1.5 US2. Pipeline: App Server/API Gateway → LLM Gateway → Orchestrator →
  // {Tool Registry, Memory Fabric}; Safety Mesh é um hop inserível em qualquer ponto da cadeia.
  llm_gateway: {
    label: 'LLM Gateway',
    icon: Bot,
    description:
      'Roteia a chamada pra um provedor de LLM (com quota, cache de resposta, fallback entre provedores). Ponto de entrada do pipeline de IA — só App Server e API Gateway conectam direto nele. Latência bem mais alta que um App Server comum: uma chamada de LLM custa centenas de milissegundos, não dezenas.',
  },
  orchestrator: {
    label: 'Orchestrator',
    icon: Workflow,
    description:
      'Coordena um workflow de agente em múltiplas etapas (ex. "buscar informação, decidir próxima ação, chamar uma ferramenta, repetir"). Cada etapa multiplica a latência acumulada — por isso o p99 dele é ainda mais alto que o do LLM Gateway isolado.',
  },
  tool_registry: {
    label: 'Tool Registry',
    icon: Wrench,
    description:
      'Catálogo das ferramentas/funções que um agente pode chamar (ex. "buscar pedido", "calcular frete"). É consulta rápida — uma lista, não uma chamada de IA — por isso sua latência é próxima da de um serviço comum, bem mais baixa que o resto do pipeline de IA.',
  },
  memory_fabric: {
    label: 'Memory Fabric',
    icon: Brain,
    description:
      'Memória de longo prazo do agente — histórico de conversas, fatos aprendidos, retrieval de contexto relevante pra próxima resposta. Sempre um destino final do Orchestrator, nunca origina conexão própria.',
  },
  safety_mesh: {
    label: 'Safety Mesh',
    icon: ShieldCheck,
    description:
      'Guarda-corpo das chamadas de IA: filtra conteúdo, aplica política e audita o que entra/sai do pipeline. Pode ser inserido em qualquer ponto da cadeia de IA (antes do LLM Gateway, entre ele e o Orchestrator, etc.) — não tem uma posição fixa única.',
  },

  // External — M1.5 US2. Sempre folha, alcançados a partir de qualquer componente de cômputo ou
  // do pipeline de IA — latência/disponibilidade fora do controle do design.
  third_party_api: {
    label: '3rd Party API',
    icon: Webhook,
    description:
      'Serviço de terceiro genérico — sua latência e disponibilidade estão fora do controle do design, por isso a spec ilustrativa tem p99 bem mais alto que qualquer componente interno. Sempre um destino final.',
  },
  payment: {
    label: 'Payment',
    icon: CreditCard,
    description:
      'Processador de pagamento externo (ex. Stripe) — cobra em dinheiro real por transação, e sua indisponibilidade bloqueia diretamente uma parte crítica do negócio. Latência mais alta e menos previsível que um serviço interno, por ser uma chamada de rede pública.',
  },
  email: {
    label: 'Email',
    icon: Mail,
    description:
      'Provedor transacional de email (confirmação de conta, recibo, alerta). Tipicamente acionado por Notifications, mas qualquer componente de cômputo pode chamá-lo diretamente. Sempre um destino final.',
  },

  // Observability — M1.5 US3. Sempre folha/sink, alcançável a partir de qualquer componente de
  // cômputo — capacidade altíssima e custo baixo (nunca é o fator limitante de um design).
  metrics: {
    label: 'Metrics',
    icon: LineChart,
    description:
      'Números de série temporal — CPU, RPS, latência — coletados de qualquer componente de cômputo pra alimentar dashboards e alertas. Capacidade altíssima, custo baixo: aceita o volume de telemetria de um sistema inteiro sem virar o fator limitante do design.',
  },
  logs: {
    label: 'Logs',
    icon: ScrollText,
    description:
      'Registro estruturado de eventos pra debug — o que aconteceu, quando, com qual contexto. Recebe eventos de qualquer componente de cômputo; nunca origina uma chamada própria.',
  },
  tracing: {
    label: 'Tracing',
    icon: Route,
    description:
      'Segue uma requisição individual através de todos os serviços que ela toca, reconstruindo a árvore de chamadas ponta a ponta. Complementa Metrics/Logs (agregado vs. individual) — mesma regra de conectividade: alcançável a partir de qualquer nó de cômputo, sempre folha.',
  },
  alerting: {
    label: 'Alerting',
    icon: Siren,
    description:
      'Observa Metrics/Logs e aciona um humano quando um limiar é cruzado (ex. taxa de erro acima de 5%). Não processa a requisição do usuário — só monitora o que os outros componentes reportam.',
  },
  health_check: {
    label: 'Health Check',
    icon: HeartPulse,
    description:
      'Sonda periódica de liveness/readiness — pergunta "esse componente ainda está de pé?" pra decidir se ele deve continuar recebendo tráfego. Barato e de altíssima capacidade, como o resto de Observability.',
  },

  // Network — M1.5 US3. Hop de altíssima capacidade posicionado antes da borda (Client → Network
  // → Load Balancer/API Gateway/CDN/App Server) — VPC/Subnet em particular MUST ter capacidade
  // maior ou igual a qualquer outro componente do catálogo (FR-006): são container de rede, não
  // um hop de processamento comum, e nunca devem aparecer como gargalo em designs razoáveis.
  vpc: {
    label: 'VPC',
    icon: Container,
    description:
      'Fatia isolada e privada da rede na nuvem — um container topológico, não um hop de processamento. A capacidade dele no catálogo é deliberadamente maior que a de qualquer outro componente, justamente pra nunca aparecer como gargalo de um design razoável.',
  },
  subnet: {
    label: 'Subnet',
    icon: Layers,
    description:
      'Subdivisão de uma VPC (pública ou privada). Mesmo tratamento de capacidade da VPC — é topologia, não um passo que consome capacidade de processamento real, então a spec garante que ele nunca vira o fator limitante.',
  },
  nat_gateway: {
    label: 'NAT Gateway',
    icon: Router,
    description:
      'Permite que uma instância numa subnet privada acesse a internet, sem expor essa instância a conexões de entrada. Capacidade alta (âncora: CDN) — participa da simulação, mas raramente é o limitante de um design.',
  },
  vpn: {
    label: 'VPN',
    icon: Lock,
    description:
      'Túnel criptografado entre redes privadas (ex. conectar o datacenter da empresa à nuvem). Mesmo papel de hop de rede de alta capacidade que o resto de Network — participa da simulação, mas o foco dele é segurança de tráfego, não processamento.',
  },
  service_mesh: {
    label: 'Service Mesh',
    icon: Network,
    description:
      'Camada sidecar que gerencia tráfego serviço-a-serviço — mTLS automático, retry, circuit breaking — sem que cada serviço precise implementar isso por conta própria. Fica na borda, entre o Cliente e os componentes que já processam requisição.',
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

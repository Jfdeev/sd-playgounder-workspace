import { FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE, type Source } from './source.js';

/**
 * União fechada dos 4 templates já existentes (apps/web/src/lib/canvas-templates.ts). Definido
 * aqui (não em apps/web) para que `Record<TemplateId, ArchitectureStyle>` abaixo seja exaustivo
 * por construção — research.md §1.2.
 */
export type TemplateId = 'monolith' | 'three-tier' | 'microservices' | 'event-driven';

export type ArchitectureStyle = {
  templateId: TemplateId;
  label: string;
  whenToUse: string;
  tradeoffs: string[];
  source: Source;
  /** Nota de leitura complementar, nunca uma citação estruturada — research.md §1.7/§3. */
  furtherReading?: string;
};

export const ARCHITECTURE_STYLES: Record<TemplateId, ArchitectureStyle> = {
  monolith: {
    templateId: 'monolith',
    label: 'Monolito',
    whenToUse:
      'Aplicações pequenas ou médias, time único, baixa necessidade de escalar partes ' +
      'independentemente, prioridade em simplicidade de deploy e desenvolvimento.',
    tradeoffs: [
      'Simplicidade operacional alta — um único artefato para implantar e monitorar.',
      'Escalabilidade é tudo-ou-nada: não é possível escalar só a parte quente do sistema.',
      'Baixo isolamento de falha — um módulo com problema pode derrubar o sistema todo.',
    ],
    source: FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
  },
  'three-tier': {
    templateId: 'three-tier',
    label: '3 Camadas',
    whenToUse:
      'Separação clara entre apresentação, lógica de negócio e dados, quando a aplicação já não ' +
      'cabe confortavelmente num monolito simples, mas a escala ainda não justifica microsserviços.',
    tradeoffs: [
      'Melhora modularidade e permite escalar a camada certa (ex. só o App Server).',
      'Ainda é um deploy relativamente acoplado entre as camadas.',
      'A camada de dados costuma ser um ponto único de falha se não for replicada.',
    ],
    source: FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
  },
  microservices: {
    templateId: 'microservices',
    label: 'Microsserviços',
    whenToUse:
      'Partes do sistema com perfis de carga/escala muito diferentes entre si, e times que ' +
      'conseguem operar serviços de forma independente.',
    tradeoffs: [
      'Escalabilidade independente e isolamento de falha altos — cada serviço escala e falha por conta própria.',
      'Complexidade operacional sobe muito: orquestração, observabilidade e comunicação de rede entre serviços.',
      'Consistência entre serviços vira um problema explícito, sem transação distribuída simples.',
    ],
    source: FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
    furtherReading:
      'Patterns of Enterprise Application Architecture (Martin Fowler) discute padrões de acesso ' +
      'a dado (Repository, Data Mapper) comuns dentro de cada serviço — esses padrões não viram ' +
      'componente novo do catálogo desta plataforma (fora de escopo, decisão registrada no marco).',
  },
  'event-driven': {
    templateId: 'event-driven',
    label: 'Orientado a Eventos',
    whenToUse:
      'Componentes que precisam reagir a mudanças de estado de forma assíncrona e desacoplada, ' +
      'tolerando consistência eventual em troca de menor acoplamento temporal entre produtor e consumidor.',
    tradeoffs: [
      'Alto desacoplamento e boa resiliência a picos de carga (a fila/broker funciona como buffer).',
      'Consistência vira eventual por padrão, não forte.',
      'Depurar o fluxo fim-a-fim (rastrear uma requisição por múltiplos eventos assíncronos) é operacionalmente mais complexo.',
    ],
    source: FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
  },
};

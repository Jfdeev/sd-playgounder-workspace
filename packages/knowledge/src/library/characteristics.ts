import type { LibraryEntry } from '../library.js';
import { FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE } from '../source.js';

const NOT_COMPUTED = 'A plataforma não calcula esta característica — ela não é uma das 7 dimensões de score.';
const COVERED_BY_SECURITY = `${NOT_COMPUTED} Na plataforma, é coberta pela dimensão Segurança.`;

function characteristic(
  id: string,
  group: string,
  name: string,
  definition: string,
  platformNote: string = NOT_COMPUTED,
): LibraryEntry {
  return {
    id,
    category: 'architecture-characteristics',
    group,
    name,
    definition,
    source: FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
    platformNote,
  };
}

/**
 * Conteúdo aprovado pelo autor em 2026-10-03 (specs/biblioteca-principios-arquitetura/content-draft.md
 * §2). As 7 dimensões de score ficam de fora — já têm ficha no M2.6.
 */
export const CHARACTERISTICS_ENTRIES: readonly LibraryEntry[] = [
  // Operacionais
  characteristic(
    'continuity',
    'Operacionais',
    'Continuidade',
    'Capacidade do sistema de manter ou retomar a operação do negócio após um desastre — o que inclui ' +
      'ter um plano de recuperação.',
  ),
  characteristic(
    'recoverability',
    'Operacionais',
    'Recuperabilidade',
    'Quão rápido o negócio volta a operar depois de uma falha grave (por exemplo, quanto tempo leva ' +
      'restaurar a partir de backup).',
  ),
  characteristic(
    'reliability-safety',
    'Operacionais',
    'Confiabilidade / segurança operacional',
    'O sistema precisa se comportar corretamente e falhar de forma segura quando uma falha custa muito ' +
      '— dinheiro, ou até vidas.',
  ),
  characteristic(
    'robustness',
    'Operacionais',
    'Robustez',
    'Capacidade de lidar com erros e condições adversas em execução (queda de rede, falta de energia, ' +
      'hardware com falha) sem deixar de funcionar de forma aceitável.',
  ),

  // Estruturais
  characteristic(
    'configurability',
    'Estruturais',
    'Configurabilidade',
    'Facilidade de o usuário final ajustar a configuração do software, sem alterar código.',
  ),
  characteristic('extensibility', 'Estruturais', 'Extensibilidade', 'Facilidade de acrescentar novas funcionalidades.'),
  characteristic(
    'installability',
    'Estruturais',
    'Instalabilidade',
    'Facilidade de instalar o sistema nas plataformas necessárias.',
  ),
  characteristic(
    'leverageability',
    'Estruturais',
    'Reaproveitamento',
    'Capacidade de reutilizar componentes comuns entre produtos ou partes do sistema.',
  ),
  characteristic(
    'localization',
    'Estruturais',
    'Localização',
    'Suporte a vários idiomas, formatos de data, moedas e convenções locais.',
  ),
  characteristic(
    'maintainability',
    'Estruturais',
    'Manutenibilidade',
    'Facilidade de aplicar mudanças e corrigir problemas no sistema.',
  ),
  characteristic('portability', 'Estruturais', 'Portabilidade', 'Capacidade de o sistema rodar em mais de uma plataforma.'),
  characteristic(
    'supportability',
    'Estruturais',
    'Suportabilidade',
    'Quanto de suporte técnico a aplicação exige — o quanto de log e de ferramenta de depuração é ' +
      'necessário para diagnosticar problemas.',
  ),
  characteristic(
    'upgradeability',
    'Estruturais',
    'Atualizabilidade',
    'Facilidade de atualizar versões já instaladas do sistema.',
  ),

  // Transversais
  characteristic(
    'accessibility',
    'Transversais',
    'Acessibilidade',
    'O sistema ser utilizável por todos, incluindo pessoas com deficiência.',
  ),
  characteristic(
    'archivability',
    'Transversais',
    'Arquivabilidade',
    'Os dados poderem ser arquivados ou apagados depois de um período, conforme a necessidade do negócio.',
  ),
  characteristic(
    'authentication',
    'Transversais',
    'Autenticação',
    'Garantir que quem usa o sistema é quem diz ser.',
    COVERED_BY_SECURITY,
  ),
  characteristic(
    'authorization',
    'Transversais',
    'Autorização',
    'Garantir que cada usuário só acessa o que tem permissão de acessar.',
    COVERED_BY_SECURITY,
  ),
  characteristic(
    'legal',
    'Transversais',
    'Legal',
    'Restrições legais e regulatórias a que o sistema precisa obedecer (proteção de dados, retenção, ' +
      'jurisdição).',
  ),
  characteristic(
    'privacy',
    'Transversais',
    'Privacidade',
    'Proteger os dados dos usuários de acesso e exposição indevidos, inclusive dentro da própria ' +
      'organização.',
  ),
];

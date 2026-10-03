import { describe, expect, it } from 'vitest';
import {
  LIBRARY_CATEGORY_LABELS,
  LIBRARY_ENTRIES,
  getLibraryEntry,
  validateLibraryEntries,
  type LibraryEntry,
} from '../src/library.js';
import { CLEAN_ARCHITECTURE, FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE } from '../src/source.js';

/** Inventário aprovado pelo autor em 2026-10-03 (research.md §1) — nada entra ou sai sem passar por aqui. */
const APPROVED_IDS = {
  'clean-architecture': [
    'srp', 'ocp', 'lsp', 'isp', 'dip',
    'dependency-rule', 'boundaries', 'database-is-a-detail', 'frameworks-are-details',
  ],
  'architecture-characteristics': [
    'continuity', 'recoverability', 'reliability-safety', 'robustness',
    'configurability', 'extensibility', 'installability', 'leverageability', 'localization',
    'maintainability', 'portability', 'supportability', 'upgradeability',
    'accessibility', 'archivability', 'authentication', 'authorization', 'legal', 'privacy',
  ],
  poeaa: [
    'service-layer', 'data-mapper', 'repository', 'remote-facade', 'data-transfer-object',
    'optimistic-offline-lock', 'pessimistic-offline-lock',
    'client-session-state', 'server-session-state', 'database-session-state', 'gateway',
  ],
} as const;

function validCleanArchitectureEntry(overrides: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    id: 'x',
    category: 'clean-architecture',
    group: 'g',
    name: 'X',
    definition: 'def',
    source: CLEAN_ARCHITECTURE,
    topology: { relation: 'analogia', note: 'nota' },
    ...overrides,
  };
}

function validCharacteristicEntry(overrides: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    id: 'y',
    category: 'architecture-characteristics',
    group: 'g',
    name: 'Y',
    definition: 'def',
    source: FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
    platformNote: 'nota',
    ...overrides,
  };
}

describe('validateLibraryEntries — cada invariante acusa uma violação (o teste não passa no vácuo)', () => {
  it('aceita entradas válidas', () => {
    expect(validateLibraryEntries([validCleanArchitectureEntry(), validCharacteristicEntry()])).toEqual([]);
  });

  it('acusa id duplicado', () => {
    const problems = validateLibraryEntries([validCleanArchitectureEntry(), validCleanArchitectureEntry()]);
    expect(problems.join('\n')).toContain('id duplicado');
  });

  it('acusa id que coincide com uma dimensão de score', () => {
    const problems = validateLibraryEntries([validCharacteristicEntry({ id: 'disponibilidade' })]);
    expect(problems.join('\n')).toContain('dimensão de score');
  });

  it('acusa fonte fora das 3 obras (mesmo com o mesmo conteúdo — identidade, não igualdade)', () => {
    const copy = { ...CLEAN_ARCHITECTURE };
    const problems = validateLibraryEntries([validCleanArchitectureEntry({ source: copy })]);
    expect(problems.join('\n')).toContain('fonte fora das 3 obras');
  });

  it('acusa definição vazia', () => {
    const problems = validateLibraryEntries([validCleanArchitectureEntry({ definition: '  ' })]);
    expect(problems.join('\n')).toContain('definição vazia');
  });

  it('acusa Clean Architecture sem topologia, ou com nota vazia (FR-004)', () => {
    const { topology: _omit, ...withoutTopology } = validCleanArchitectureEntry();
    expect(validateLibraryEntries([withoutTopology]).join('\n')).toContain('relação com a topologia');
    const blankNote = validCleanArchitectureEntry({ topology: { relation: 'nenhuma', note: ' ' } });
    expect(validateLibraryEntries([blankNote]).join('\n')).toContain('relação com a topologia');
  });

  it('acusa característica/padrão sem platformNote', () => {
    const { platformNote: _omit, ...without } = validCharacteristicEntry();
    expect(validateLibraryEntries([without]).join('\n')).toContain('platformNote');
  });
});

describe('LIBRARY_ENTRIES', () => {
  it('é válida segundo todos os invariantes', () => {
    expect(validateLibraryEntries(LIBRARY_ENTRIES)).toEqual([]);
  });

  it.each(Object.entries(APPROVED_IDS))('%s: exatamente o inventário aprovado, sem sobra nem falta', (category, ids) => {
    const actual = LIBRARY_ENTRIES.filter((entry) => entry.category === category).map((entry) => entry.id);
    expect([...actual].sort()).toEqual([...ids].sort());
  });

  it('tem 39 entradas no total', () => {
    expect(LIBRARY_ENTRIES).toHaveLength(39);
  });

  it('inclui os cinco princípios SOLID (FR-003)', () => {
    for (const id of ['srp', 'ocp', 'lsp', 'isp', 'dip']) {
      expect(getLibraryEntry(id)?.category).toBe('clean-architecture');
    }
  });

  it('LSP, ISP e "frameworks são detalhes" declaram explicitamente que não há relação com a topologia', () => {
    for (const id of ['lsp', 'isp', 'frameworks-are-details']) {
      expect(getLibraryEntry(id)?.topology?.relation).toBe('nenhuma');
    }
  });

  it('nenhuma entrada promete que a plataforma calcula o princípio (só "analogia" ou "nenhuma")', () => {
    for (const entry of LIBRARY_ENTRIES) {
      if (entry.topology) expect(['analogia', 'nenhuma']).toContain(entry.topology.relation);
    }
  });

  it('autenticação e autorização dizem que são cobertas pela dimensão Segurança', () => {
    expect(getLibraryEntry('authentication')?.platformNote).toContain('Segurança');
    expect(getLibraryEntry('authorization')?.platformNote).toContain('Segurança');
  });

  it('todo padrão do Fowler diz que é leitura recomendada (FR-005)', () => {
    for (const entry of LIBRARY_ENTRIES.filter((e) => e.category === 'poeaa')) {
      expect(entry.platformNote).toContain('Leitura recomendada');
    }
  });

  it('toda categoria tem rótulo', () => {
    for (const entry of LIBRARY_ENTRIES) {
      expect(LIBRARY_CATEGORY_LABELS[entry.category].length).toBeGreaterThan(0);
    }
  });
});

describe('getLibraryEntry', () => {
  it('devolve a entrada certa', () => {
    expect(getLibraryEntry('srp')?.name).toContain('Responsabilidade Única');
  });

  it('devolve undefined para um id inexistente', () => {
    expect(getLibraryEntry('microkernel')).toBeUndefined();
  });
});

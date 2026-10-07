import { describe, expect, it } from 'vitest';
import { LIBRARY_ENTRIES } from '@sdp/knowledge';
import { filterLibraryEntries } from '../src/lib/library-search';

const ids = (query: string) => filterLibraryEntries(LIBRARY_ENTRIES, query).map((entry) => entry.id);

describe('filterLibraryEntries', () => {
  it('query vazia (ou só espaços) devolve a biblioteca inteira', () => {
    expect(ids('')).toHaveLength(LIBRARY_ENTRIES.length);
    expect(ids('   ')).toHaveLength(LIBRARY_ENTRIES.length);
  });

  it('casa por nome, sem diferenciar maiúsculas', () => {
    expect(ids('REPOSITORY')).toContain('repository');
    expect(ids('repository')).toContain('repository');
  });

  it('ignora acento tanto na busca quanto no nome', () => {
    // nome: "Princípio da Responsabilidade Única (SRP)" — busca sem acento acha
    expect(ids('responsabilidade unica')).toContain('srp');
    // e o contrário: busca com acento acha um nome sem acento na origem
    expect(ids('Frameworks são detalhes')).toContain('frameworks-are-details');
  });

  it('casa por id', () => {
    expect(ids('optimistic-offline-lock')).toEqual(['optimistic-offline-lock']);
  });

  it('casa por grupo — "solid" devolve exatamente os 5 princípios SOLID', () => {
    expect(ids('solid').sort()).toEqual(['dip', 'isp', 'lsp', 'ocp', 'srp']);
  });

  it('uma busca ampla devolve várias entradas', () => {
    expect(ids('lock')).toEqual(expect.arrayContaining(['optimistic-offline-lock', 'pessimistic-offline-lock']));
  });

  it('sem resultado devolve lista vazia (a UI mostra o estado vazio)', () => {
    expect(ids('microkernel')).toEqual([]);
  });

  it('não muta a lista original', () => {
    const before = LIBRARY_ENTRIES.length;
    filterLibraryEntries(LIBRARY_ENTRIES, 'srp');
    expect(LIBRARY_ENTRIES).toHaveLength(before);
  });
});

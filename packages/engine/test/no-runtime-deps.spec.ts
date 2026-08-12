import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * FR-017, constitution II: packages/engine não pode importar React, Next.js, cliente HTTP nem
 * SDK de LLM. Este teste falha se qualquer arquivo de `src/` importar um desses pacotes.
 */

const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+['"]react['"]/,
  /from\s+['"]react-dom['"]/,
  /from\s+['"]next(\/|['"])/,
  /from\s+['"]axios['"]/,
  /from\s+['"]node-fetch['"]/,
  /from\s+['"]@anthropic-ai\//,
  /from\s+['"]openai['"]/,
];

function listTsFilesRecursively(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return listTsFilesRecursively(fullPath);
    return entry.name.endsWith('.ts') ? [fullPath] : [];
  });
}

describe('zero dependência de runtime (FR-017, constitution II)', () => {
  const srcDir = join(import.meta.dirname, '..', 'src');
  const files = listTsFilesRecursively(srcDir);

  it('encontra arquivos-fonte para verificar (sanity check do teste em si)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s não importa React, Next.js, cliente HTTP ou SDK de LLM', (file) => {
    const content = readFileSync(file, 'utf-8');
    for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
      expect(content).not.toMatch(pattern);
    }
  });

  it('package.json não declara nenhuma dependência de runtime (só devDependencies)', () => {
    const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf-8')) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies ?? {}).toEqual({});
  });
});

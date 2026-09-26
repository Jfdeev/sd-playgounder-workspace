import { describe, expect, it } from 'vitest';
import { ARCHITECTURE_STYLES } from '@sdp/knowledge';
import { ARCHITECTURE_TEMPLATES } from '../src/lib/canvas-templates';

describe('TemplateId — mão dupla entre templates e fichas de estilo', () => {
  it('todo template de apps/web tem uma ficha em @sdp/knowledge, e vice-versa, sem duplicata', () => {
    const templateIds = ARCHITECTURE_TEMPLATES.map((template) => template.id);
    const fichaIds = Object.keys(ARCHITECTURE_STYLES);

    expect(new Set(templateIds).size).toBe(templateIds.length);
    expect(new Set(fichaIds).size).toBe(fichaIds.length);
    expect([...templateIds].sort()).toEqual([...fichaIds].sort());
  });
});

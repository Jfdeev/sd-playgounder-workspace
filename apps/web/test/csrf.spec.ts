import { describe, expect, it } from 'vitest';
import { isSameOriginRequest } from '../src/lib/csrf';

describe('isSameOriginRequest', () => {
  it('permite quando Origin bate exatamente com a origem esperada', () => {
    expect(isSameOriginRequest('https://sdplayground.example', 'https://sdplayground.example')).toBe(
      true,
    );
  });

  it('nega quando Origin é de outro domínio (o ataque que isto mitiga)', () => {
    expect(isSameOriginRequest('https://evil.example', 'https://sdplayground.example')).toBe(false);
  });

  it('nega quando só o protocolo difere (http vs https)', () => {
    expect(isSameOriginRequest('http://sdplayground.example', 'https://sdplayground.example')).toBe(
      false,
    );
  });

  it('nega quando só a porta difere', () => {
    expect(
      isSameOriginRequest('https://sdplayground.example:3000', 'https://sdplayground.example:4000'),
    ).toBe(false);
  });

  it('permite quando Origin está ausente (requisição não-browser, fora do escopo do CSRF)', () => {
    expect(isSameOriginRequest(null, 'https://sdplayground.example')).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { getClientIp } from '../src/lib/client-ip';

describe('getClientIp', () => {
  it('usa o primeiro IP de x-forwarded-for quando presente', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1, 10.0.0.2' });
    expect(getClientIp(headers)).toBe('203.0.113.5');
  });

  it('remove espaços em volta do IP em x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '  203.0.113.5  , 10.0.0.1' });
    expect(getClientIp(headers)).toBe('203.0.113.5');
  });

  it('cai para x-real-ip quando x-forwarded-for está ausente', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.7' });
    expect(getClientIp(headers)).toBe('198.51.100.7');
  });

  it('prioriza x-forwarded-for sobre x-real-ip quando os dois existem', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.5',
      'x-real-ip': '198.51.100.7',
    });
    expect(getClientIp(headers)).toBe('203.0.113.5');
  });

  it('retorna "unknown" quando nenhum header de proxy existe (dev local sem proxy)', () => {
    expect(getClientIp(new Headers())).toBe('unknown');
  });
});

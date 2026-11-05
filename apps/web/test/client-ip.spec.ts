import { describe, expect, it } from 'vitest';
import { getClientIp } from '../src/lib/client-ip';

describe('getClientIp (relatório de segurança, item 7)', () => {
  it('usa o ÚLTIMO valor de x-forwarded-for — o do proxy mais próximo, não o que o cliente escreveu', () => {
    const headers = new Headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.5' });
    expect(getClientIp(headers)).toBe('203.0.113.5');
  });

  it('trocar o valor forjado no início não muda o IP usado', () => {
    const a = new Headers({ 'x-forwarded-for': '1.1.1.1, 203.0.113.5' });
    const b = new Headers({ 'x-forwarded-for': '2.2.2.2, 203.0.113.5' });
    expect(getClientIp(a)).toBe(getClientIp(b));
  });

  it('ignora espaços e entradas vazias', () => {
    expect(getClientIp(new Headers({ 'x-forwarded-for': ' 203.0.113.5 , ' }))).toBe('203.0.113.5');
  });

  it('cai para x-real-ip quando não há x-forwarded-for utilizável', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7');
    expect(getClientIp(new Headers({ 'x-forwarded-for': ' , ', 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7');
  });

  it('com cabeçalho confiável configurado, usa só ele', () => {
    const headers = new Headers({ 'x-forwarded-for': '6.6.6.6', 'x-vercel-forwarded-for': '203.0.113.9, 10.0.0.1' });
    expect(getClientIp(headers, 'x-vercel-forwarded-for')).toBe('203.0.113.9');
    expect(getClientIp(new Headers({ 'x-forwarded-for': '6.6.6.6' }), 'x-real-ip')).toBe('unknown');
  });

  it('retorna "unknown" sem nenhum cabeçalho (dev local)', () => {
    expect(getClientIp(new Headers())).toBe('unknown');
  });
});

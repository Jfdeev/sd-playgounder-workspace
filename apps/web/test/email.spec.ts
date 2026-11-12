import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.hoisted(() => vi.fn());

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

describe('sendConfirmationEmail', () => {
  const originalApiKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    sendMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = originalApiKey;
    vi.restoreAllMocks();
  });

  it('não chama o Resend e resolve sem lançar quando RESEND_API_KEY não está configurada', async () => {
    delete process.env.RESEND_API_KEY;
    const { sendConfirmationEmail } = await import('../src/lib/email');

    await expect(
      sendConfirmationEmail('user@example.com', 'token-123', 'http://localhost:3000'),
    ).resolves.toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledOnce();
  });

  it('chama o Resend com o link de confirmação quando a chave está configurada', async () => {
    process.env.RESEND_API_KEY = 'stub'; // valor curto e não-secreto, só para passar no truthy-check
    sendMock.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });
    const { sendConfirmationEmail } = await import('../src/lib/email');

    await sendConfirmationEmail('user@example.com', 'token-123', 'http://localhost:3000');

    expect(sendMock).toHaveBeenCalledOnce();
    const callArgs = sendMock.mock.calls[0]?.[0];
    expect(callArgs.to).toBe('user@example.com');
    expect(callArgs.html).toContain('token-123');
  });

  it('captura erro do envio e resolve mesmo assim (degradação graciosa, research.md §4)', async () => {
    process.env.RESEND_API_KEY = 'stub'; // valor curto e não-secreto, só para passar no truthy-check
    sendMock.mockRejectedValueOnce(new Error('Resend indisponível'));
    const { sendConfirmationEmail } = await import('../src/lib/email');

    await expect(
      sendConfirmationEmail('user@example.com', 'token-123', 'http://localhost:3000'),
    ).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledOnce();
  });
});

describe('sendExistingAccountNotice (relatório de segurança, item 8)', () => {
  beforeEach(() => {
    sendMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('avisa o dono do email com o link de login', async () => {
    process.env.RESEND_API_KEY = 'stub';
    sendMock.mockResolvedValueOnce({ data: { id: 'email-2' }, error: null });
    const { sendExistingAccountNotice } = await import('../src/lib/email');

    await sendExistingAccountNotice('dono@example.com', 'http://localhost:3000');

    const callArgs = sendMock.mock.calls[0]?.[0];
    expect(callArgs.to).toBe('dono@example.com');
    expect(callArgs.html).toContain('http://localhost:3000/entrar');
  });
});

describe('sendPasswordResetEmail (specs/conta-lgpd, US1)', () => {
  beforeEach(() => {
    sendMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('manda o link de redefinição com o token', async () => {
    process.env.RESEND_API_KEY = 'stub';
    sendMock.mockResolvedValueOnce({ data: { id: 'email-3' }, error: null });
    const { sendPasswordResetEmail } = await import('../src/lib/email');

    await sendPasswordResetEmail('ana@example.com', 'tok-1', 'http://localhost:3000');

    const callArgs = sendMock.mock.calls[0]?.[0];
    expect(callArgs.to).toBe('ana@example.com');
    expect(callArgs.html).toContain('http://localhost:3000/redefinir-senha?token=tok-1');
  });
});

describe('senderAddress (EMAIL_FROM)', () => {
  it('usa EMAIL_FROM quando definida, e o sandbox do Resend quando não', async () => {
    const { senderAddress } = await import('../src/lib/email');
    expect(senderAddress('SDP <nao-responda@exemplo.com>')).toBe('SDP <nao-responda@exemplo.com>');
    expect(senderAddress('  ')).toBe('System Design Playground <onboarding@resend.dev>');
    expect(senderAddress(undefined)).toBe('System Design Playground <onboarding@resend.dev>');
  });

  it('o envio usa o remetente configurado', async () => {
    process.env.RESEND_API_KEY = 'stub';
    process.env.EMAIL_FROM = 'SDP <nao-responda@exemplo.com>';
    sendMock.mockReset();
    sendMock.mockResolvedValueOnce({ data: { id: 'email-4' }, error: null });
    const { sendConfirmationEmail } = await import('../src/lib/email');
    await sendConfirmationEmail('ana@example.com', 'tok', 'http://localhost:3000');
    expect(sendMock.mock.calls[0]?.[0].from).toBe('SDP <nao-responda@exemplo.com>');
    delete process.env.EMAIL_FROM;
  });
});

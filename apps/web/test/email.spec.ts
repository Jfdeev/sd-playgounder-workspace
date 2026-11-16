import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMailMock = vi.hoisted(() => vi.fn());
const createTransportMock = vi.hoisted(() => vi.fn(() => ({ sendMail: sendMailMock })));

vi.mock('nodemailer', () => ({ default: { createTransport: createTransportMock } }));

const SMTP_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'EMAIL_FROM'] as const;
const original = Object.fromEntries(SMTP_KEYS.map((key) => [key, process.env[key]]));

function configureSmtp() {
  process.env.SMTP_USER = 'projeto@gmail.com';
  process.env.SMTP_PASSWORD = 'stub'; // valor curto e não-secreto, só para passar no truthy-check
}

beforeEach(() => {
  for (const key of SMTP_KEYS) delete process.env[key];
  sendMailMock.mockReset();
  createTransportMock.mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  for (const key of SMTP_KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
  vi.restoreAllMocks();
});

describe('smtpConfig', () => {
  it('sem usuário ou senha não há configuração', async () => {
    const { smtpConfig } = await import('../src/lib/email');
    expect(smtpConfig({})).toBeNull();
    expect(smtpConfig({ SMTP_USER: 'a@gmail.com' })).toBeNull();
    expect(smtpConfig({ SMTP_USER: ' ', SMTP_PASSWORD: 'x' })).toBeNull();
  });

  it('usa os padrões do Gmail e a própria conta como remetente', async () => {
    const { smtpConfig } = await import('../src/lib/email');
    expect(smtpConfig({ SMTP_USER: 'a@gmail.com', SMTP_PASSWORD: 'x' })).toEqual({
      host: 'smtp.gmail.com',
      port: 465,
      user: 'a@gmail.com',
      password: 'x',
      from: 'System Design Playground <a@gmail.com>',
    });
  });

  it('respeita host, porta e remetente configurados', async () => {
    const { smtpConfig } = await import('../src/lib/email');
    expect(
      smtpConfig({ SMTP_USER: 'u', SMTP_PASSWORD: 'p', SMTP_HOST: 'smtp.exemplo.com', SMTP_PORT: '587', EMAIL_FROM: 'SDP <x@y.com>' }),
    ).toMatchObject({ host: 'smtp.exemplo.com', port: 587, from: 'SDP <x@y.com>' });
  });
});

describe('envio', () => {
  it('sem SMTP configurado não tenta enviar e resolve sem lançar', async () => {
    const { sendConfirmationEmail } = await import('../src/lib/email');
    await expect(sendConfirmationEmail('user@example.com', 'token-123', 'http://localhost:3000')).resolves.toBeUndefined();
    expect(createTransportMock).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledOnce();
  });

  it('confirmação: envia pelo SMTP, com TLS na porta 465 e o link no corpo', async () => {
    configureSmtp();
    const { sendConfirmationEmail } = await import('../src/lib/email');
    await sendConfirmationEmail('user@example.com', 'token-123', 'http://localhost:3000');

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: 'projeto@gmail.com', pass: 'stub' },
    });
    const mail = sendMailMock.mock.calls[0]?.[0];
    expect(mail.from).toBe('System Design Playground <projeto@gmail.com>');
    expect(mail.to).toBe('user@example.com');
    expect(mail.html).toContain('token-123');
  });

  it('porta diferente de 465 usa STARTTLS (secure: false)', async () => {
    configureSmtp();
    process.env.SMTP_PORT = '587';
    const { sendConfirmationEmail } = await import('../src/lib/email');
    await sendConfirmationEmail('user@example.com', 'token-123', 'http://localhost:3000');
    expect(createTransportMock).toHaveBeenCalledWith(expect.objectContaining({ port: 587, secure: false }));
  });

  it('captura erro do envio e resolve mesmo assim (degradação graciosa)', async () => {
    configureSmtp();
    sendMailMock.mockRejectedValueOnce(new Error('SMTP indisponível'));
    const { sendConfirmationEmail } = await import('../src/lib/email');
    await expect(sendConfirmationEmail('user@example.com', 'token-123', 'http://localhost:3000')).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledOnce();
  });

  it('aviso de conta existente leva o link de login', async () => {
    configureSmtp();
    const { sendExistingAccountNotice } = await import('../src/lib/email');
    await sendExistingAccountNotice('dono@example.com', 'http://localhost:3000');
    expect(sendMailMock.mock.calls[0]?.[0].html).toContain('http://localhost:3000/entrar');
  });

  it('redefinição de senha leva o link com o token', async () => {
    configureSmtp();
    const { sendPasswordResetEmail } = await import('../src/lib/email');
    await sendPasswordResetEmail('ana@example.com', 'tok-1', 'http://localhost:3000');
    expect(sendMailMock.mock.calls[0]?.[0].html).toContain('http://localhost:3000/redefinir-senha?token=tok-1');
  });
});

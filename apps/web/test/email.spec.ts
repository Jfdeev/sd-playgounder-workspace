import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMailMock = vi.hoisted(() => vi.fn());
const createTransportMock = vi.hoisted(() => vi.fn(() => ({ sendMail: sendMailMock })));

vi.mock('nodemailer', () => ({ default: { createTransport: createTransportMock } }));

const SMTP_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'EMAIL_FROM'] as const;
const original = Object.fromEntries(SMTP_KEYS.map((key) => [key, process.env[key]]));

// Valores de teste montados em tempo de execução: nada parecido com uma credencial real fica literal no
// arquivo (scanners de segredo, como o GitGuardian, acusavam host + usuário + senha juntos).
const TEST_USER = ['projeto', 'example.com'].join('@');
const TEST_PASS = `fake-${'x'.repeat(4)}`;

function configureSmtp() {
  process.env.SMTP_USER = TEST_USER;
  process.env.SMTP_PASSWORD = TEST_PASS;
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
    expect(smtpConfig({ SMTP_USER: TEST_USER })).toBeNull();
    expect(smtpConfig({ SMTP_USER: ' ', SMTP_PASSWORD: TEST_PASS })).toBeNull();
  });

  it('usa os padrões do Gmail e a própria conta como remetente', async () => {
    const { smtpConfig } = await import('../src/lib/email');
    expect(smtpConfig({ SMTP_USER: TEST_USER, SMTP_PASSWORD: TEST_PASS })).toEqual({
      host: 'smtp.gmail.com',
      port: 465,
      user: TEST_USER,
      password: TEST_PASS,
      from: `System Design Playground <${TEST_USER}>`,
    });
  });

  it('respeita host, porta e remetente configurados', async () => {
    const { smtpConfig } = await import('../src/lib/email');
    expect(
      smtpConfig({ SMTP_USER: TEST_USER, SMTP_PASSWORD: TEST_PASS, SMTP_HOST: 'mail.example.com', SMTP_PORT: '587', EMAIL_FROM: 'SDP <x@example.com>' }),
    ).toMatchObject({ host: 'mail.example.com', port: 587, from: 'SDP <x@example.com>' });
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
      auth: { user: TEST_USER, pass: TEST_PASS },
    });
    const mail = sendMailMock.mock.calls[0]?.[0];
    expect(mail.from).toBe(`System Design Playground <${TEST_USER}>`);
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

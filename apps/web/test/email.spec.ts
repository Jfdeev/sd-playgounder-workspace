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

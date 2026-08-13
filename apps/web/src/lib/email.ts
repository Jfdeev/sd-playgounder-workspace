import { Resend } from 'resend';

const FROM_ADDRESS = 'System Design Playground <noreply@systemdesignplayground.dev>';

function buildConfirmationUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/api/account/confirm-email?token=${encodeURIComponent(token)}`;
}

/**
 * Envia o email de confirmação de conta (FR-013a). Degradação graciosa (research.md §4): se o
 * envio falhar (RESEND_API_KEY ausente/inválida, serviço fora do ar), a falha é logada e a
 * Promise resolve normalmente — a conta continua totalmente funcional sem o email confirmado,
 * então uma falha de envio não é motivo para bloquear o signup.
 */
export async function sendConfirmationEmail(
  to: string,
  token: string,
  baseUrl: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(
      `[email] RESEND_API_KEY não configurada — email de confirmação para ${to} não foi enviado.`,
    );
    return;
  }

  const resend = new Resend(apiKey);
  const confirmationUrl = buildConfirmationUrl(baseUrl, token);

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: 'Confirme seu email — System Design Playground',
      html: `<p>Clique para confirmar seu email: <a href="${confirmationUrl}">${confirmationUrl}</a></p>`,
    });
  } catch (error) {
    console.error(`[email] falha ao enviar confirmação para ${to}:`, error);
  }
}

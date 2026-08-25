import { Resend } from 'resend';

// BUGFIX (2026-08-25): `systemdesignplayground.dev` nunca foi verificado como domínio de envio
// no Resend (confirmado via GET /domains da própria API do Resend: retorna `[]`, zero domínios) —
// todo envio falhava sempre, silenciosamente, capturado pelo try/catch abaixo (nunca chegava a
// nenhuma caixa de entrada desde M0.5). `onboarding@resend.dev` é o remetente sandbox do próprio
// Resend, funciona sem verificação de domínio, mas só entrega pro email da conta Resend dona da
// API key — suficiente para dev/teste local. Trocar por um domínio próprio verificado antes de
// qualquer usuário real além do autor depender do link de confirmação.
const FROM_ADDRESS = 'System Design Playground <onboarding@resend.dev>';

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

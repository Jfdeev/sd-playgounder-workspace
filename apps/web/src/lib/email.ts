import { Resend } from 'resend';

// Remetente vem de `EMAIL_FROM` (endereço de um domínio verificado no Resend, ex.
// `System Design Playground <nao-responda@seudominio.com>`). Sem ela, cai no remetente sandbox do
// Resend (`onboarding@resend.dev`), que funciona sem verificar domínio mas só entrega pro email da conta
// Resend dona da API key — serve para dev, nunca para produção (BUGFIX de 2026-08-25: um domínio nunca
// verificado fazia todo envio falhar em silêncio).
const SANDBOX_FROM = 'System Design Playground <onboarding@resend.dev>';

export function senderAddress(emailFrom: string | undefined = process.env.EMAIL_FROM): string {
  return emailFrom?.trim() || SANDBOX_FROM;
}

function buildConfirmationUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/api/account/confirm-email?token=${encodeURIComponent(token)}`;
}

/**
 * Degradação graciosa (research.md §4): se o envio falhar (RESEND_API_KEY ausente/inválida, serviço fora
 * do ar), a falha é logada e a Promise resolve normalmente — um e-mail que não sai nunca bloqueia o cadastro.
 */
async function sendEmail(to: string, subject: string, html: string, what: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(`[email] RESEND_API_KEY não configurada — ${what} para ${to} não foi enviado.`);
    return;
  }
  try {
    await new Resend(apiKey).emails.send({ from: senderAddress(), to, subject, html });
  } catch (error) {
    console.error(`[email] falha ao enviar ${what} para ${to}:`, error);
  }
}

/** Envia o email de confirmação de conta (FR-013a). `token` vai em claro no link; o banco guarda só o hash. */
export async function sendConfirmationEmail(to: string, token: string, baseUrl: string): Promise<void> {
  const confirmationUrl = buildConfirmationUrl(baseUrl, token);
  await sendEmail(
    to,
    'Confirme seu email — System Design Playground',
    `<p>Clique para confirmar seu email: <a href="${confirmationUrl}">${confirmationUrl}</a></p>`,
    'email de confirmação',
  );
}

/**
 * Relatório de segurança, item 8: o cadastro responde igual para email novo e existente (não revela quem
 * tem conta); quem já tem conta recebe este aviso, para saber da tentativa e entrar pelo login.
 */
export async function sendExistingAccountNotice(to: string, baseUrl: string): Promise<void> {
  const loginUrl = `${baseUrl}/entrar`;
  await sendEmail(
    to,
    'Tentativa de cadastro com seu email — System Design Playground',
    `<p>Alguém tentou criar uma conta com este email, que já tem conta. Se foi você, entre por <a href="${loginUrl}">${loginUrl}</a>. Se não foi, ignore este aviso — nada mudou na sua conta.</p>`,
    'aviso de conta existente',
  );
}

/** Link de redefinição de senha (specs/conta-lgpd, US1) — vale 1 hora e serve uma vez. */
export async function sendPasswordResetEmail(to: string, token: string, baseUrl: string): Promise<void> {
  const resetUrl = `${baseUrl}/redefinir-senha?token=${encodeURIComponent(token)}`;
  await sendEmail(
    to,
    'Redefinir sua senha — System Design Playground',
    `<p>Para criar uma senha nova, abra <a href="${resetUrl}">${resetUrl}</a>. O link vale 1 hora e funciona uma vez. Se não foi você que pediu, ignore este e-mail — sua senha continua a mesma.</p>`,
    'link de redefinição de senha',
  );
}

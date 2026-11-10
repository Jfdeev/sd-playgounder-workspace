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
    await new Resend(apiKey).emails.send({ from: FROM_ADDRESS, to, subject, html });
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

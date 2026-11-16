import nodemailer from 'nodemailer';

/**
 * Envio de e-mail por SMTP (decisão do autor, 2026-11-15: sai o Resend, que só entregava com domínio próprio
 * verificado). Padrão: Gmail (`smtp.gmail.com:465`) com a conta do projeto e uma "senha de app" do Google
 * (exige verificação em 2 etapas na conta). Limite do Gmail: ~500 e-mails por dia.
 */

export type SmtpConfig = { host: string; port: number; user: string; password: string; from: string };

/** Lido de `process.env`: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD e EMAIL_FROM. */
type EmailEnv = Readonly<Record<string, string | undefined>>;

/** Configuração SMTP a partir do ambiente; `null` sem usuário ou senha (aí nenhum e-mail sai — só log). */
export function smtpConfig(env: EmailEnv): SmtpConfig | null {
  const user = env.SMTP_USER?.trim();
  const password = env.SMTP_PASSWORD?.trim();
  if (!user || !password) return null;
  const port = Number(env.SMTP_PORT) || 465;
  return {
    host: env.SMTP_HOST?.trim() || 'smtp.gmail.com',
    port,
    user,
    password,
    from: env.EMAIL_FROM?.trim() || `System Design Playground <${user}>`,
  };
}

function buildConfirmationUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/api/account/confirm-email?token=${encodeURIComponent(token)}`;
}

/**
 * Degradação graciosa (research.md §4): se o envio falhar (SMTP não configurado, senha inválida, serviço fora
 * do ar), a falha é logada e a Promise resolve normalmente — um e-mail que não sai nunca bloqueia o cadastro.
 */
async function sendEmail(to: string, subject: string, html: string, what: string): Promise<void> {
  const config = smtpConfig(process.env);
  if (!config) {
    console.error(`[email] SMTP_USER/SMTP_PASSWORD não configurados — ${what} para ${to} não foi enviado.`);
    return;
  }
  try {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.password },
    });
    await transport.sendMail({ from: config.from, to, subject, html });
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

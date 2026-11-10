import Link from 'next/link';
import { AuthShell } from '../_components/auth-shell';
import { RedefinirSenhaForm } from './_redefinir-senha-form';

// O token vem do link do e-mail (`?token=`); a validade só é conferida no servidor, ao enviar.
export default async function RedefinirSenhaPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;

  return (
    <AuthShell
      title="Criar senha nova"
      subtitle="Depois disso, as sessões abertas em outros lugares são encerradas."
      footer={
        <Link href="/esqueci-senha" className="font-medium text-violet-400 hover:text-violet-300">
          Pedir outro link
        </Link>
      }
    >
      {typeof token === 'string' && token ? (
        <RedefinirSenhaForm token={token} />
      ) : (
        <p role="alert" className="text-sm text-red-400">
          Link inválido ou expirado. Peça um novo.
        </p>
      )}
    </AuthShell>
  );
}

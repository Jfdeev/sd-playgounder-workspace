import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL_CONTROLLER, MINIMUM_AGE } from '@/lib/legal';
import { LegalPage } from '../_components/legal-page';

export const metadata: Metadata = { title: 'Termos de uso — System Design Playground' };

// Rascunho para revisão do autor (specs/conta-lgpd).
export default function TermosPage() {
  const { name, contactEmail } = LEGAL_CONTROLLER;
  return (
    <LegalPage title="Termos de uso">
      <p>
        Ao criar uma conta ou usar o System Design Playground você concorda com estes termos. O serviço é oferecido pelo{' '}
        {name}, projeto mantido por pessoa física. Contato: <strong>{contactEmail}</strong>.
      </p>

      <h2>O que é o serviço</h2>
      <p>
        Uma ferramenta gratuita de aprendizado de system design. Os números vêm de um modelo analítico pedagógico — não
        é um simulador de produção e não deve ser usado para dimensionar sistemas reais. As explicações do narrador são
        geradas por inteligência artificial a partir desses números e podem conter erros.
      </p>

      <h2>Conta</h2>
      <ul>
        <li>Você precisa ter {MINIMUM_AGE} anos ou mais.</li>
        <li>Use um email seu e mantenha a senha em segredo; você responde pelo que for feito com a sua conta.</li>
        <li>Você pode excluir a conta quando quiser, em Progresso.</li>
      </ul>

      <h2>O que não é permitido</h2>
      <ul>
        <li>Tentar acessar contas, dados ou partes do sistema que não são suas, ou burlar limites de segurança.</li>
        <li>Automatizar o uso para sobrecarregar o serviço, o narrador ou o envio de emails.</li>
        <li>Usar apelidos ou nomes de design ofensivos, ou se passar por outra pessoa.</li>
      </ul>

      <h2>Seu conteúdo</h2>
      <p>
        Os designs que você cria são seus. Você nos autoriza a guardá-los e a mostrá-los a quem você compartilhar o
        link, só para fazer o serviço funcionar.
      </p>

      <h2>Disponibilidade</h2>
      <p>
        O serviço é oferecido “como está”, sem garantia de disponibilidade contínua; o narrador pode ficar indisponível
        quando a cota do provedor de IA acabar. Funcionalidades podem mudar ou ser removidas.
      </p>

      <h2>Suspensão</h2>
      <p>Contas que violem estes termos podem ser suspensas ou excluídas.</p>

      <h2>Privacidade</h2>
      <p>
        O tratamento de dados pessoais está descrito na{' '}
        <Link href="/privacidade" className="text-violet-400 hover:text-violet-300">
          Política de privacidade
        </Link>
        .
      </p>

      <h2>Lei aplicável</h2>
      <p>Estes termos seguem a lei brasileira.</p>
    </LegalPage>
  );
}

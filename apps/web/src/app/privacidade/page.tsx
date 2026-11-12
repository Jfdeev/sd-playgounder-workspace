import type { Metadata } from 'next';
import { LEGAL_CONTROLLER, MINIMUM_AGE } from '@/lib/legal';
import { LegalPage } from '../_components/legal-page';

export const metadata: Metadata = { title: 'Política de privacidade — System Design Playground' };

// Rascunho para revisão do autor (specs/conta-lgpd) — descreve o que o código de fato coleta e onde guarda.
export default function PrivacidadePage() {
  const { name, contactEmail } = LEGAL_CONTROLLER;
  return (
    <LegalPage title="Política de privacidade">
      <p>
        Esta política explica quais dados pessoais o System Design Playground trata, para quê e quais são os seus
        direitos, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
      </p>

      <h2>Quem é o responsável</h2>
      <p>
        O controlador dos dados é o {name}, projeto mantido por pessoa física. Pedidos sobre privacidade: <strong>{contactEmail}</strong>.
      </p>

      <h2>Quais dados tratamos</h2>
      <ul>
        <li>
          <strong>Conta</strong>: email, senha (guardada só como hash, nunca em texto) e a data em que o email foi
          confirmado. Se você entra com Google, recebemos também nome e foto do perfil Google.
        </li>
        <li>
          <strong>Uso do produto</strong>: designs que você salva e suas versões, desafios e incidentes resolvidos,
          XP, conquistas, dias de atividade (para a ofensiva), apelido e se o seu perfil é visível.
        </li>
        <li>
          <strong>Segurança</strong>: o endereço IP de quem tenta entrar, se cadastrar ou pedir um link, usado só em
          contadores temporários para limitar abuso.
        </li>
        <li>
          <strong>No seu navegador</strong>: um cookie de sessão (necessário para manter você conectado) e o rascunho
          do canvas guardado localmente. Não usamos cookies de publicidade nem de rastreamento.
        </li>
      </ul>

      <h2>Para quê e com qual base legal</h2>
      <ul>
        <li>Criar e manter a sua conta e o seu progresso — execução do serviço que você pediu (art. 7º, V).</li>
        <li>Enviar emails de confirmação, de redefinição de senha e avisos de segurança — idem.</li>
        <li>Limitar tentativas de login e cadastro para proteger as contas — legítimo interesse (art. 7º, IX).</li>
        <li>
          Mostrar seu apelido, nível, XP, conquistas e desafios no ranking e no perfil público, apenas para pessoas
          logadas e só se você tiver um apelido e deixar o perfil visível — você controla isso em Ranking.
        </li>
      </ul>

      <h2>Com quem compartilhamos</h2>
      <p>Não vendemos dados. Usamos fornecedores que tratam dados em nosso nome:</p>
      <ul>
        <li>Neon (banco de dados) — Estados Unidos.</li>
        <li>Resend (envio de emails) — Estados Unidos.</li>
        <li>Google — login com Google; e o narrador, que envia ao Google Gemini só a arquitetura simulada (componentes e números), nunca seus dados de conta.</li>
        <li>O provedor de hospedagem do site.</li>
      </ul>
      <p>
        Como esses fornecedores ficam fora do Brasil, há transferência internacional de dados, feita para executar o
        serviço (art. 33 da LGPD).
      </p>
      <p>
        Um design só fica visível para outras pessoas se você gerar o link de compartilhamento; quem abre precisa estar
        logado, e você pode revogar o link a qualquer momento.
      </p>

      <h2>Por quanto tempo</h2>
      <p>
        Enquanto a sua conta existir. Ao excluir a conta, os dados dela são apagados na hora, inclusive os contadores
        de tentativa ligados a ela. Contadores de tentativa só por IP (sem conta) ficam guardados para limitar abuso e
        guardam apenas o endereço e o número de tentativas.
      </p>

      <h2>Seus direitos</h2>
      <ul>
        <li><strong>Acesso e portabilidade</strong>: em Progresso → “Baixar meus dados” (arquivo JSON).</li>
        <li><strong>Exclusão</strong>: em Progresso → “Excluir minha conta” — apaga tudo na hora, sem desfazer.</li>
        <li><strong>Correção</strong>: apelido e visibilidade em Ranking; demais dados, pelo email de contato.</li>
        <li>Informação, revogação do consentimento e reclamação: pelo email de contato ou à ANPD.</li>
      </ul>

      <h2>Idade mínima</h2>
      <p>O serviço é para pessoas com {MINIMUM_AGE} anos ou mais.</p>

      <h2>Mudanças</h2>
      <p>Se esta política mudar, a data da versão no topo é atualizada.</p>
    </LegalPage>
  );
}

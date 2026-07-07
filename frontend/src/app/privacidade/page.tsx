import type { Metadata } from "next";
import { PaginaConteudoLegal, SecaoLegal } from "@/components/pagina-conteudo-legal";

export const metadata: Metadata = { title: "Privacidade — Gancho" };

export default function PaginaPrivacidade() {
  return (
    <PaginaConteudoLegal titulo="POLÍTICA DE PRIVACIDADE" atualizadoEm="6 de julho de 2026">
      <SecaoLegal titulo="1. Quem trata seus dados">
        <p>
          O Gancho é o controlador dos dados pessoais tratados nesta plataforma. Para qualquer
          assunto relacionado à sua privacidade — dúvidas, correções, exclusão de dados — fale
          com a gente em{" "}
          <a href="mailto:contato@gancho.app" className="font-semibold underline decoration-marca decoration-4 underline-offset-4 hover:text-tinta">
            contato@gancho.app
          </a>
          .
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="2. Quais dados coletamos">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Nome e e-mail, informados no cadastro;</li>
          <li>Senha, armazenada com hash (bcrypt) — nunca em texto simples;</li>
          <li>Temas, formatos, tons e palavras-chave que você informa para gerar roteiros;</li>
          <li>Os roteiros gerados a partir dessas informações;</li>
          <li>Endereço IP, usado para limitar tentativas de login e abuso da geração de roteiros (rate limiting).</li>
        </ul>
      </SecaoLegal>

      <SecaoLegal titulo="3. Base legal (LGPD)">
        <p>
          Tratamos seus dados com base na execução do contrato de uso da plataforma (Lei Geral de
          Proteção de Dados, Lei 13.709/2018) — é preciso processar nome, e-mail e senha para
          criar e manter sua conta, e o tema/formato informado para gerar o roteiro solicitado.
          Onde aplicável, também nos apoiamos em legítimo interesse para prevenção a fraude e
          abuso (ex.: rate limiting por IP).
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="4. Com quem compartilhamos dados">
        <p>Para operar o Gancho, alguns dados passam por prestadores de serviço terceiros:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong className="text-tinta">Groq, Google Gemini e (no plano pro) Anthropic Claude</strong> — recebem o tema/formato/tom que você informa para gerar o roteiro;</li>
          <li><strong className="text-tinta">Resend</strong> — envia o e-mail de recuperação de senha;</li>
          <li><strong className="text-tinta">MongoDB Atlas</strong> — armazena os dados da plataforma;</li>
          <li><strong className="text-tinta">Vercel</strong> e <strong className="text-tinta">Render</strong> — hospedam o frontend e o backend, respectivamente;</li>
          <li><strong className="text-tinta">Cloudflare Turnstile</strong> — verifica que o cadastro e a recuperação de senha não são feitos por robôs.</li>
        </ul>
        <p>
          Alguns desses provedores processam dados fora do Brasil. Não vendemos nem
          compartilhamos seus dados com terceiros para fins de publicidade.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="5. Cookies">
        <p>
          Usamos apenas um cookie técnico, <code className="rounded bg-tinta/10 px-1.5 py-0.5 font-mono text-[13px]">gancho_refresh</code>,
          para manter sua sessão logada por até 7 dias. Ele é <code className="rounded bg-tinta/10 px-1.5 py-0.5 font-mono text-[13px]">httpOnly</code> (scripts
          não conseguem lê-lo) e não é usado para rastreamento ou publicidade. O Gancho não usa
          cookies de analytics ou de terceiros para rastrear sua navegação.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="6. Por quanto tempo guardamos seus dados">
        <p>
          Sua conta e seus dados de cadastro ficam guardados enquanto a conta estiver ativa.
          Mantemos apenas os 30 roteiros mais recentes por conta — os excedentes são apagados
          automaticamente. Hoje a plataforma ainda não tem um fluxo de autoatendimento para
          exclusão de conta; se você quiser que seus dados sejam removidos, entre em contato pelo
          e-mail acima.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="7. Seus direitos">
        <p>
          Conforme a LGPD, você pode solicitar a qualquer momento: confirmação de que tratamos
          seus dados, acesso aos dados, correção de dados incompletos ou desatualizados,
          exclusão dos seus dados, portabilidade para outro serviço, e informação sobre com quem
          compartilhamos seus dados. Para exercer qualquer um desses direitos, escreva para{" "}
          <a href="mailto:contato@gancho.app" className="font-semibold underline decoration-marca decoration-4 underline-offset-4 hover:text-tinta">
            contato@gancho.app
          </a>
          .
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="8. Segurança">
        <p>
          Senhas são protegidas com hash bcrypt; o token de sessão de renovação (refresh) é
          guardado no servidor apenas como um hash SHA-256, nunca em texto simples; o cookie de
          sessão é <code className="rounded bg-tinta/10 px-1.5 py-0.5 font-mono text-[13px]">httpOnly</code> e
          criptografado em trânsito (HTTPS). Nenhum sistema é 100% imune a falhas, mas seguimos
          boas práticas de segurança no desenvolvimento da plataforma.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="9. Menores de idade">
        <p>
          O Gancho não é direcionado a menores de 18 anos e não coleta intencionalmente dados de
          crianças ou adolescentes sem o consentimento de um responsável legal.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="10. Alterações nesta política">
        <p>
          Podemos atualizar esta Política conforme a plataforma evolui. Mudanças relevantes serão
          sinalizadas na própria plataforma.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="11. Contato">
        <p>
          Dúvidas sobre privacidade? Escreva para{" "}
          <a href="mailto:contato@gancho.app" className="font-semibold underline decoration-marca decoration-4 underline-offset-4 hover:text-tinta">
            contato@gancho.app
          </a>
          .
        </p>
      </SecaoLegal>
    </PaginaConteudoLegal>
  );
}

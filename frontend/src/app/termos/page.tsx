import type { Metadata } from "next";
import { PaginaConteudoLegal, SecaoLegal } from "@/components/pagina-conteudo-legal";

export const metadata: Metadata = { title: "Termos de uso — Gancho" };

export default function PaginaTermos() {
  return (
    <PaginaConteudoLegal titulo="TERMOS DE USO" atualizadoEm="6 de julho de 2026">
      <SecaoLegal titulo="1. O que é o Gancho">
        <p>
          O Gancho é uma plataforma que gera roteiros de vídeo curto (Reels, TikTok, Shorts) a
          partir de um tema informado por você, usando modelos de inteligência artificial de
          terceiros e padrões estruturais de vídeos que já viralizaram. Ao criar uma conta e usar
          o serviço, você concorda com estes Termos.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="2. Definições">
        <p>
          <strong className="text-tinta">Conta:</strong> o cadastro feito com nome, e-mail e
          senha. <strong className="text-tinta">Conteúdo gerado:</strong> os roteiros produzidos
          pela IA a partir das suas entradas (tema, formato, tom, público, palavra-chave).{" "}
          <strong className="text-tinta">Plano:</strong> o nível de acesso da sua conta (free ou
          pro).
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="3. Cadastro e elegibilidade">
        <p>
          Você precisa fornecer um e-mail válido de um provedor conhecido e uma senha que
          atenda aos critérios mínimos de segurança exigidos no cadastro. Você é responsável por
          manter a confidencialidade da sua senha e por tudo que acontecer na sua conta. O
          cadastro é destinado a maiores de 18 anos; se você tem menos de 18 anos, use a
          plataforma apenas com supervisão e consentimento de um responsável legal.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="4. Planos e limites de uso">
        <p>
          O plano gratuito tem um limite diário de geração de roteiros. O plano pago (&quot;pro&quot;)
          está em preparação e, quando lançado, terá condições próprias descritas na página de
          planos no momento da contratação — nenhuma cobrança está ativa hoje. Podemos ajustar
          limites e características de cada plano mediante aviso prévio na plataforma.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="5. Uso aceitável">
        <p>Ao usar o Gancho, você concorda em não:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>usar a geração de roteiros para produzir conteúdo ilegal, discriminatório, difamatório ou que incite violência;</li>
          <li>tentar contornar limites de uso, rate limits ou mecanismos anti-abuso da plataforma;</li>
          <li>usar scripts automatizados, bots ou qualquer meio não autorizado para acessar a API do Gancho;</li>
          <li>revender ou redistribuir acesso à plataforma sem autorização.</li>
        </ul>
      </SecaoLegal>

      <SecaoLegal titulo="6. Propriedade do conteúdo gerado">
        <p>
          Os roteiros gerados a partir das suas entradas são seus, para usar como quiser
          (incluindo fins comerciais). O Gancho não reivindica propriedade sobre o conteúdo
          gerado para a sua conta. Os padrões estruturais usados como referência para a IA
          pertencem à curadoria da plataforma e não são conteúdo gerado para você.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="7. Sem garantia de resultado ou viralização">
        <p>
          O Gancho ajuda a estruturar roteiros com base em padrões de vídeos que performaram bem
          no passado — isso não é garantia de que qualquer vídeo produzido a partir de um roteiro
          gerado vai viralizar, gerar engajamento ou qualquer resultado específico. Não fazemos
          nem faremos essa promessa em nenhuma comunicação da plataforma. O resultado final
          depende de fatores fora do nosso controle (edição, entrega, algoritmo de cada rede,
          entre outros).
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="8. Disponibilidade do serviço">
        <p>
          A geração de roteiros depende de provedores de IA de terceiros (como Groq, Google
          Gemini e, no plano pro, modelos da Anthropic). Se algum desses provedores ficar
          indisponível, a geração pode falhar temporariamente — nesse caso, a tentativa não
          consome o seu limite diário. Não garantimos disponibilidade ininterrupta da
          plataforma.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="9. Encerramento de conta">
        <p>
          Você pode parar de usar a plataforma a qualquer momento. Podemos suspender ou encerrar
          contas que violem estes Termos, especialmente as condutas listadas na seção 5. Hoje a
          plataforma ainda não tem um fluxo de autoatendimento para exclusão de conta — se você
          quiser encerrar a sua conta ou solicitar a remoção dos seus dados, entre em contato
          pelo e-mail abaixo.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="10. Alterações nestes Termos">
        <p>
          Podemos atualizar estes Termos conforme a plataforma evolui. Mudanças relevantes serão
          sinalizadas na própria plataforma. O uso continuado do Gancho após uma atualização
          significa que você concorda com a nova versão.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="11. Lei aplicável">
        <p>
          Estes Termos são regidos pelas leis do Brasil. Qualquer disputa relacionada a eles será
          resolvida no foro do domicílio do usuário, conforme a legislação brasileira de defesa
          do consumidor, quando aplicável.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="12. Contato">
        <p>
          Dúvidas sobre estes Termos? Escreva para{" "}
          <a href="mailto:contato@gancho.app" className="font-semibold underline decoration-marca decoration-4 underline-offset-4 hover:text-tinta">
            contato@gancho.app
          </a>
          .
        </p>
      </SecaoLegal>
    </PaginaConteudoLegal>
  );
}

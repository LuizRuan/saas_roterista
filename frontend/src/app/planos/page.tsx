import type { Metadata } from "next";
import { PaginaEmProducao } from "@/components/pagina-em-producao";

export const metadata: Metadata = { title: "Planos — Gancho" };

export default function PaginaPlanos() {
  return (
    <PaginaEmProducao
      titulo="O PLANO PRO ESTÁ EM PRODUÇÃO"
      texto="Pagamentos chegam em breve. Enquanto isso, o plano gratuito vai estar aberto para você testar o Gancho sem cartão."
    />
  );
}

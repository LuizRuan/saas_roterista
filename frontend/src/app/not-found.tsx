import type { Metadata } from "next";
import { PaginaEmProducao } from "@/components/pagina-em-producao";

export const metadata: Metadata = { title: "Página não encontrada — Gancho" };

export default function NotFound() {
  return (
    <PaginaEmProducao
      eyebrow="[404]"
      titulo="ESSA PÁGINA SAIU DE CENA"
      texto="O endereço que você tentou abrir não existe ou foi movido. Confira o link ou volte para o início."
      voltar="/"
      voltarTexto="Voltar para o início"
    />
  );
}

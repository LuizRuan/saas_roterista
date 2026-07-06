import type { Metadata } from "next";
import { PaginaEmProducao } from "@/components/pagina-em-producao";

export const metadata: Metadata = { title: "Privacidade — Gancho" };

export default function PaginaPrivacidade() {
  return (
    <PaginaEmProducao
      titulo="POLÍTICA DE PRIVACIDADE"
      texto="Documento em elaboração — será publicado antes do lançamento da plataforma."
    />
  );
}

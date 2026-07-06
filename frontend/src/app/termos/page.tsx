import type { Metadata } from "next";
import { PaginaEmProducao } from "@/components/pagina-em-producao";

export const metadata: Metadata = { title: "Termos de uso — Gancho" };

export default function PaginaTermos() {
  return (
    <PaginaEmProducao
      titulo="TERMOS DE USO"
      texto="Documento em elaboração — será publicado antes do lançamento da plataforma."
    />
  );
}

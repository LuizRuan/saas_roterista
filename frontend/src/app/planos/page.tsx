import type { Metadata } from "next";
import { PainelPlanos } from "@/components/planos/painel-planos";

export const metadata: Metadata = { title: "Planos — Gancho" };

export default function PaginaPlanos() {
  return <PainelPlanos />;
}

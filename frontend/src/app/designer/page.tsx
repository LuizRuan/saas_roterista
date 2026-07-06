import type { Metadata } from "next";
import { Designer } from "@/components/dashboard/designer";

export const metadata: Metadata = {
  title: "Designer de Roteiros — Gancho",
  description:
    "Crie roteiros de vídeo virais com IA. Configure o tema, formato e tom narrativo e receba uma estrutura otimizada para retenção.",
};

export default function PaginaDesigner() {
  return <Designer />;
}

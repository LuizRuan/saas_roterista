import type { Metadata } from "next";
import { PainelConta } from "@/components/conta/painel-conta";

export const metadata: Metadata = { title: "Conta — Gancho" };

export default function PaginaConta() {
  return <PainelConta />;
}

import type { Metadata } from "next";
import { Configuracoes } from "@/components/dashboard/configuracoes";

export const metadata: Metadata = {
  title: "Configurações — Gancho",
  description: "Dados da sua conta e exclusão de conta.",
};

export default function PaginaConfiguracoes() {
  return <Configuracoes />;
}

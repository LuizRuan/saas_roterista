import type { Metadata } from "next";
import { PainelAdmin } from "@/components/admin/painel-admin";

export const metadata: Metadata = {
  title: "Admin — Padrões Virais · Gancho",
};

export default function PaginaAdmin() {
  return <PainelAdmin />;
}

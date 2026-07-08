import type { Metadata } from "next";
import { NovoPadrao } from "@/components/admin/novo-padrao";

export const metadata: Metadata = {
  title: "Novo padrão — Admin · Gancho",
};

export default function PaginaNovoPadrao() {
  return <NovoPadrao />;
}

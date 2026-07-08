import type { Metadata } from "next";
import { EditarPadrao } from "@/components/admin/editar-padrao";

export const metadata: Metadata = {
  title: "Editar padrão — Admin · Gancho",
};

export default function PaginaEditarPadrao() {
  return <EditarPadrao />;
}

import type { Metadata } from "next";
import { FormularioLogin } from "@/components/auth/formulario-login";

export const metadata: Metadata = { title: "Entrar — Gancho" };

export default function PaginaLogin() {
  return <FormularioLogin />;
}

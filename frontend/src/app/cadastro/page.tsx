import type { Metadata } from "next";
import { FormularioCadastro } from "@/components/auth/formulario-cadastro";

export const metadata: Metadata = { title: "Cadastro — Gancho" };

export default function PaginaCadastro() {
  return <FormularioCadastro />;
}

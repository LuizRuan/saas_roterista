import type { Metadata } from "next";
import { MeusRoteiros } from "@/components/dashboard/meus-roteiros";

export const metadata: Metadata = {
  title: "Meus Roteiros — Gancho",
  description: "Veja, copie e reutilize todos os roteiros que você já gerou no Gancho.",
};

export default function PaginaMeusRoteiros() {
  return <MeusRoteiros />;
}

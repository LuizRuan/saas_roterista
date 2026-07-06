import type { Metadata } from "next";
import { Painel } from "@/components/dashboard/painel";

export const metadata: Metadata = { title: "Dashboard — Gancho" };

export default function PaginaDashboard() {
  return <Painel />;
}

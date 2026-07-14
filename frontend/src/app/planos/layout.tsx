import type { Metadata } from "next";

export const metadata: Metadata = { title: "Planos — Gancho" };

export default function LayoutPlanos({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

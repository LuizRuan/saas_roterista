/** Rodapé mínimo compartilhado das telas logadas. */
export function RodapeApp({
  texto = "Gancho · Roteiros virais com IA",
}: {
  texto?: string;
}) {
  return (
    <footer className="border-t border-tinta/10 py-4 text-center">
      <p className="font-mono text-[10px] uppercase tracking-widest text-cinza">
        {texto}
      </p>
    </footer>
  );
}

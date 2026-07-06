/**
 * Eyebrow de seção no formato de marcação de roteiro: "[00:15] EXEMPLOS".
 * A página inteira segue a estrutura de um vídeo de 60s — cada seção
 * é uma "cena" com seu timestamp.
 */
export function Marcador({ tempo, cena }: { tempo: string; cena: string }) {
  return (
    <p className="font-mono text-xs sm:text-sm font-medium tracking-widest uppercase text-tinta-suave">
      <span className="text-rec">[{tempo}]</span> {cena}
    </p>
  );
}

/**
 * Mensagem honesta de cold start — o backend no Render free "dorme" e a
 * primeira visita do dia pode levar alguns segundos até ele acordar. Mostrada
 * no lugar do "Abrindo estúdio…" quando o carregamento passa do limiar
 * (ver useEsperaLonga), sem cancelar a requisição em andamento.
 */
export function AcordandoEstudio() {
  return (
    <p className="flex max-w-xs flex-col items-center gap-2 text-center font-mono text-sm uppercase tracking-widest text-tinta-suave">
      <span className="flex items-center gap-2">
        <span aria-hidden className="rec-pulso inline-block size-2 rounded-full bg-rec" />
        Acordando o estúdio…
      </span>
      <span className="text-xs normal-case tracking-normal text-cinza">
        A primeira visita do dia pode levar alguns segundos.
      </span>
    </p>
  );
}

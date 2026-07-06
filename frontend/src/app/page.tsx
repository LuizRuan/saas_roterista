import { ComoFunciona } from "@/components/landing/como-funciona";
import { Exemplos } from "@/components/landing/exemplos";
import { Faq } from "@/components/landing/faq";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Planos } from "@/components/landing/planos";
import { TelaFinal } from "@/components/landing/tela-final";

export default function PaginaInicial() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <ComoFunciona />
        <Exemplos />
        <Planos />
        <Faq />
      </main>
      <TelaFinal />
    </>
  );
}

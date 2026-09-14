import { redirect } from "next/navigation";

/** A seção não tem tela própria: a primeira aba é a porta de entrada. */
export default function IndiceConfiguracoes() {
  redirect("/configuracoes/roteiros");
}

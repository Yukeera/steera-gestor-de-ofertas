/**
 * O WhatsApp que leva ao funil da oferta.
 *
 * O banco guarda só dígitos com código do país, porque é a forma que o
 * `wa.me` aceita. Aqui ficam as três conversões entre essa forma e o que
 * humano lê ou digita.
 */

/** Número brasileiro completo: 55 + DDD + 8 ou 9 dígitos. */
const BRASIL = /^55(\d{2})(\d{4,5})(\d{4})$/;

export type Normalizacao =
  | { numero: string | null; erro?: undefined }
  | { numero?: undefined; erro: string };

/**
 * Transforma o que a pessoa digitou na forma canônica.
 *
 * Aceita máscara, espaço, `+` e traço — ninguém digita E.164 de cabeça. E
 * completa o `55` quando vêm só DDD e número, que é como a equipe fala o
 * telefone no dia a dia; sem isso o link `wa.me` sairia quebrado e só se
 * descobriria ao clicar.
 */
export function normalizarWhatsapp(bruto: string): Normalizacao {
  const texto = bruto.trim();
  const digitos = texto.replace(/\D/g, "");

  if (digitos.length === 0) return { numero: null };

  // O `+` é a pessoa dizendo que já pôs o código do país. Sem essa saída,
  // um número dos Estados Unidos (+1 e 10 dígitos) tem os mesmos 11 dígitos
  // de um celular brasileiro e viraria um `55` na frente de Nova York.
  const internacional = texto.startsWith("+");

  // 10 = DDD + 8 dígitos (fixo/antigo), 11 = DDD + 9 dígitos (celular).
  const completo =
    !internacional && (digitos.length === 10 || digitos.length === 11)
      ? `55${digitos}`
      : digitos;

  if (completo.length < 10 || completo.length > 15) {
    return {
      erro: "Número incompleto. Use DDD + número, ou o número com o código do país.",
    };
  }

  return { numero: completo };
}

/** `5511999998888` → `+55 (11) 99999-8888`. Fora do Brasil, só `+dígitos`. */
export function formatarWhatsapp(numero: string): string {
  const brasileiro = BRASIL.exec(numero);
  if (!brasileiro) return `+${numero}`;

  const [, ddd, meio, fim] = brasileiro;
  return `+55 (${ddd}) ${meio}-${fim}`;
}

/** Abre a conversa direto, sem a pessoa ter que salvar o contato antes. */
export function linkWhatsapp(numero: string): string {
  return `https://wa.me/${numero}`;
}

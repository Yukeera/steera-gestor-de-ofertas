import { criarClienteServidor } from "@/lib/supabase/server";

export const BUCKET_AVATARES = "avatares";
export const BUCKET_OFERTAS = "ofertas";

/**
 * Uma hora. Tempo de sobra para a pessoa olhar a tela sem a imagem morrer na
 * frente dela, e curto o bastante para um link vazado não valer nada amanhã.
 */
const VALIDADE_SEGUNDOS = 60 * 60;

/**
 * Converte caminhos do Storage em URLs assinadas.
 *
 * Em lote de propósito: uma grade de equipe tem N fotos, e pedir uma assinatura
 * por vez seriam N viagens ao Supabase. `createSignedUrls` resolve tudo numa.
 *
 * Devolve um mapa caminho → URL. Caminho que falhou simplesmente não entra no
 * mapa: foto quebrada vira avatar de iniciais, não uma tela de erro.
 */
export async function assinarCaminhos(
  bucket: string,
  caminhos: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unicos = [...new Set(caminhos.filter((c): c is string => Boolean(c)))];
  const mapa = new Map<string, string>();

  if (unicos.length === 0) return mapa;

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(unicos, VALIDADE_SEGUNDOS);

  if (error || !data) return mapa;

  for (const item of data) {
    if (item.signedUrl && item.path) mapa.set(item.path, item.signedUrl);
  }

  return mapa;
}

/** Versão de um caminho só, para telas que mostram uma imagem apenas. */
export async function assinarCaminho(
  bucket: string,
  caminho: string | null | undefined,
): Promise<string | null> {
  if (!caminho) return null;
  const mapa = await assinarCaminhos(bucket, [caminho]);
  return mapa.get(caminho) ?? null;
}

/**
 * Caminho da foto de um membro.
 *
 * O primeiro nível de pasta é o id do dono — é nele que a policy de Storage se
 * apoia para decidir quem pode escrever (ver migration 20260911120000).
 *
 * O sufixo aleatório existe porque bucket privado também passa por CDN: sem
 * ele, trocar a foto mantendo o mesmo caminho deixaria a antiga em cache.
 */
export function caminhoAvatar(membroId: string, extensao: string): string {
  const sufixo = crypto.randomUUID().slice(0, 8);
  return `${membroId}/${sufixo}.${extensao}`;
}

const EXTENSAO_POR_TIPO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function extensaoDeImagem(tipo: string): string | null {
  return EXTENSAO_POR_TIPO[tipo] ?? null;
}

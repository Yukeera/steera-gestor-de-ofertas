/**
 * Preparo de imagem no navegador, antes do upload.
 *
 * Roda no cliente de propósito (RNF-07): evita uma dependência de
 * processamento de imagem no servidor e, principalmente, evita mandar 8 MB de
 * foto de celular pela rede para guardar algo que vai ser exibido em 400px.
 */

const QUALIDADE = 0.9;

async function paraArquivo(
  canvas: HTMLCanvasElement,
  nome: string,
): Promise<File> {
  const blob = await new Promise<Blob | null>((resolver) =>
    canvas.toBlob(resolver, "image/webp", QUALIDADE),
  );

  if (!blob) throw new Error("O navegador não conseguiu processar a imagem.");

  return new File([blob], nome, { type: "image/webp" });
}

/** Recorta no centro e devolve um quadrado de `lado` px. Para avatares. */
export async function prepararQuadrado(
  arquivo: File,
  lado = 400,
): Promise<File> {
  const bitmap = await createImageBitmap(arquivo);

  const corte = Math.min(bitmap.width, bitmap.height);
  const origemX = (bitmap.width - corte) / 2;
  const origemY = (bitmap.height - corte) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = lado;
  canvas.height = lado;

  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("O navegador não conseguiu processar a imagem.");

  contexto.drawImage(bitmap, origemX, origemY, corte, corte, 0, 0, lado, lado);
  bitmap.close();

  return paraArquivo(canvas, "imagem.webp");
}

/**
 * Reduz mantendo a proporção, com o maior lado em `maximo` px.
 * Para capas e criativos, onde recortar perderia informação do anúncio.
 */
export async function prepararProporcional(
  arquivo: File,
  maximo = 1200,
): Promise<File> {
  const bitmap = await createImageBitmap(arquivo);

  const escala = Math.min(1, maximo / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;

  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("O navegador não conseguiu processar a imagem.");

  contexto.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  return paraArquivo(canvas, "imagem.webp");
}

export const TIPOS_DE_IMAGEM = "image/jpeg,image/png,image/webp";

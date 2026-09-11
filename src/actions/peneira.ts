"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { exigirMembro, ehMestreOuChefe } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BUCKET_OFERTAS, extensaoDeImagem } from "@/lib/storage";

export type Resultado = { ok: true; id?: string } | { ok: false; erro: string };

const esquemaIdeia = z.object({
  nome: z.string().trim().min(3, "Dê um nome de ao menos 3 letras à oferta."),
  descricao: z
    .string()
    .trim()
    .min(10, "Descreva em pelo menos uma frase o que o produto oferece."),
  anunciante_referencia: z.string().trim().max(200).optional().or(z.literal("")),
  url_referencia: z
    .string()
    .trim()
    .url("O link de referência precisa ser uma URL completa.")
    .optional()
    .or(z.literal("")),
  nicho: z.string().trim().max(80).optional().or(z.literal("")),
});

function lerFormulario(formData: FormData) {
  return esquemaIdeia.safeParse({
    nome: formData.get("nome"),
    descricao: formData.get("descricao"),
    anunciante_referencia: formData.get("anunciante_referencia") ?? "",
    url_referencia: formData.get("url_referencia") ?? "",
    nicho: formData.get("nicho") ?? "",
  });
}

/** Campo de texto vazio vira null: "" e "sem valor" não são a mesma coisa. */
function ouNulo(valor: string | undefined): string | null {
  return valor && valor.length > 0 ? valor : null;
}

/**
 * Sobe uma imagem para `ofertas/<oferta_id>/`.
 *
 * O id da oferta é o primeiro nível de pasta porque é assim que o arquivo fica
 * rastreável até o dono — e é o que a policy de Storage espera.
 */
type ResultadoUpload =
  | { caminho: string; erro?: undefined }
  | { caminho?: undefined; erro: string };

async function subirImagem(
  supabase: Awaited<ReturnType<typeof criarClienteServidor>>,
  ofertaId: string,
  arquivo: File,
): Promise<ResultadoUpload> {
  const extensao = extensaoDeImagem(arquivo.type);
  if (!extensao) {
    return { erro: "Formato de imagem não aceito. Use JPG, PNG ou WebP." };
  }

  const caminho = `${ofertaId}/${crypto.randomUUID()}.${extensao}`;

  const { error } = await supabase.storage
    .from(BUCKET_OFERTAS)
    .upload(caminho, arquivo, { contentType: arquivo.type });

  // Devolver o erro em vez de engolir: upload que falha calado vira "salvo com
  // sucesso" na tela e uma oferta sem capa no banco, sem ninguém saber por quê.
  return error ? { erro: `Falha ao enviar a imagem: ${error.message}` } : { caminho };
}

function imagensDoFormulario(formData: FormData, campo: string): File[] {
  return formData
    .getAll(campo)
    .filter((v): v is File => v instanceof File && v.size > 0);
}

/**
 * RF-02.1 — cadastra uma ideia na Peneira.
 *
 * A oferta nasce aqui e é a mesma linha até o Painel: `NA_PENEIRA` não é uma
 * tabela de "ideias", é o primeiro status da oferta. Por isso tudo que é
 * preenchido agora chega intacto lá na frente, sem recadastro.
 *
 * A oferta é inserida antes dos arquivos porque o caminho no Storage depende
 * do id dela.
 */
export async function criarIdeia(formData: FormData): Promise<Resultado> {
  const membro = await exigirMembro();

  const analise = lerFormulario(formData);
  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0].message };
  }

  const dados = analise.data;
  const supabase = await criarClienteServidor();

  const { data: oferta, error } = await supabase
    .from("ofertas")
    .insert({
      nome: dados.nome,
      descricao: dados.descricao,
      anunciante_referencia: ouNulo(dados.anunciante_referencia),
      url_referencia: ouNulo(dados.url_referencia),
      nicho: ouNulo(dados.nicho),
      criada_por: membro.id,
    })
    .select("id")
    .single();

  if (error || !oferta) {
    return { ok: false, erro: error?.message ?? "Não foi possível salvar." };
  }

  const capa = imagensDoFormulario(formData, "capa")[0];
  if (capa) {
    const envio = await subirImagem(supabase, oferta.id, capa);
    if (envio.erro) {
      // A ideia já está salva: avisar sobre a capa é melhor do que apagar tudo.
      revalidatePath("/peneira");
      return { ok: false, erro: `${envio.erro} A ideia foi salva sem capa.` };
    }
    await supabase
      .from("ofertas")
      .update({ capa_path: envio.caminho })
      .eq("id", oferta.id);
  }

  const criativos = imagensDoFormulario(formData, "criativos");
  if (criativos.length > 0) {
    const caminhos: string[] = [];
    for (const arquivo of criativos) {
      const envio = await subirImagem(supabase, oferta.id, arquivo);
      if (envio.caminho) caminhos.push(envio.caminho);
    }

    if (caminhos.length > 0) {
      await supabase.from("oferta_anexos").insert(
        caminhos.map((caminho) => ({
          oferta_id: oferta.id,
          tipo: "CRIATIVO" as const,
          caminho,
          enviado_por: membro.id,
        })),
      );
    }
  }

  revalidatePath("/peneira");
  return { ok: true, id: oferta.id };
}

/**
 * RF-02.1 — edita a ideia.
 *
 * Só enquanto ela está na Peneira: depois de escalada, mexer nos dados de
 * origem reescreveria a história da oferta. Quem precisa corrigir algo depois
 * disso é Chefe ou Mestre, pela tela da oferta.
 */
export async function atualizarIdeia(
  ofertaId: string,
  formData: FormData,
): Promise<Resultado> {
  const membro = await exigirMembro();

  const analise = lerFormulario(formData);
  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0].message };
  }

  const supabase = await criarClienteServidor();

  const { data: atual } = await supabase
    .from("ofertas")
    .select("status, criada_por")
    .eq("id", ofertaId)
    .single();

  if (!atual) return { ok: false, erro: "Ideia não encontrada." };

  if (atual.status !== "NA_PENEIRA") {
    return {
      ok: false,
      erro: "Esta oferta já saiu da Peneira e não pode mais ser editada aqui.",
    };
  }

  if (atual.criada_por !== membro.id && !ehMestreOuChefe(membro)) {
    return { ok: false, erro: "Você só pode editar as ideias que cadastrou." };
  }

  const dados = analise.data;

  const { error } = await supabase
    .from("ofertas")
    .update({
      nome: dados.nome,
      descricao: dados.descricao,
      anunciante_referencia: ouNulo(dados.anunciante_referencia),
      url_referencia: ouNulo(dados.url_referencia),
      nicho: ouNulo(dados.nicho),
    })
    .eq("id", ofertaId);

  if (error) return { ok: false, erro: error.message };

  const capa = imagensDoFormulario(formData, "capa")[0];
  if (capa) {
    const envio = await subirImagem(supabase, ofertaId, capa);
    if (envio.erro) {
      revalidatePath("/peneira");
      return { ok: false, erro: envio.erro };
    }

    const { error: erroCapa } = await supabase
      .from("ofertas")
      .update({ capa_path: envio.caminho })
      .eq("id", ofertaId);

    if (erroCapa) {
      revalidatePath("/peneira");
      return { ok: false, erro: erroCapa.message };
    }
  }

  revalidatePath("/peneira");
  return { ok: true };
}

/**
 * RF-02.4 — descarta a ideia.
 *
 * Soft delete com motivo: ideia descartada some da grade padrão mas continua
 * no banco. Saber o que foi recusado, e por quê, evita a equipe recadastrar a
 * mesma oferta daqui a três meses.
 */
export async function descartarIdeia(
  ofertaId: string,
  motivo: string,
): Promise<Resultado> {
  const membro = await exigirMembro();
  const supabase = await criarClienteServidor();

  const { data: atual } = await supabase
    .from("ofertas")
    .select("status, criada_por")
    .eq("id", ofertaId)
    .single();

  if (!atual) return { ok: false, erro: "Ideia não encontrada." };

  if (atual.status !== "NA_PENEIRA") {
    return {
      ok: false,
      erro: "Só dá para descartar o que ainda está na Peneira.",
    };
  }

  if (atual.criada_por !== membro.id && !ehMestreOuChefe(membro)) {
    return { ok: false, erro: "Você só pode descartar as ideias que cadastrou." };
  }

  const { error } = await supabase
    .from("ofertas")
    .update({
      status: "DESCARTADA",
      motivo_descarte: motivo.trim() || null,
    })
    .eq("id", ofertaId);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/peneira");
  return { ok: true };
}

/** Traz de volta uma ideia descartada. Descartar não é decisão definitiva. */
export async function restaurarIdeia(ofertaId: string): Promise<Resultado> {
  const membro = await exigirMembro();
  const supabase = await criarClienteServidor();

  const { data: atual } = await supabase
    .from("ofertas")
    .select("status, criada_por")
    .eq("id", ofertaId)
    .single();

  if (!atual) return { ok: false, erro: "Ideia não encontrada." };

  if (atual.status !== "DESCARTADA") {
    return { ok: false, erro: "Esta oferta não está descartada." };
  }

  if (atual.criada_por !== membro.id && !ehMestreOuChefe(membro)) {
    return { ok: false, erro: "Você só pode restaurar as ideias que cadastrou." };
  }

  const { error } = await supabase
    .from("ofertas")
    .update({ status: "NA_PENEIRA", motivo_descarte: null })
    .eq("id", ofertaId);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/peneira");
  return { ok: true };
}

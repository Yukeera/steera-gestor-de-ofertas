"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  exigirChefe,
  exigirMembro,
  obterMembroAtual,
} from "@/lib/auth/sessao";
import { criarClienteAdmin, criarClienteServidor } from "@/lib/supabase/server";
import {
  BUCKET_AVATARES,
  caminhoAvatar,
  extensaoDeImagem,
} from "@/lib/storage";
import { CARGOS, FUNCOES } from "@/lib/dominio/tipos";

export type Resultado = { ok: true } | { ok: false; erro: string };

/**
 * Para onde o link do convite leva depois de validado.
 *
 * Aponta para `/auth/entrada`, que é página e não rota de servidor, porque o
 * template padrão de e-mail do Supabase devolve a sessão no fragmento da URL
 * — e fragmento só existe no navegador. Editar o template para mandar o token
 * na query exigiria SMTP próprio, que o painel cobra para liberar a edição.
 *
 * Precisa estar na lista de Redirect URLs do painel, senão o Supabase ignora
 * e joga a pessoa na Site URL. Ver docs/SETUP.md.
 */
function urlDeAceite(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  return `${base}/auth/entrada?next=/definir-senha`;
}

/**
 * RF-01.1 — reenvia o acesso por e-mail.
 *
 * O token do e-mail vale uma vez só e expira. Sem isto, um link queimado
 * obrigaria o Chefe a ir no painel do Supabase para destravar alguém.
 *
 * Dois caminhos, porque `inviteUserByEmail` recusa quem já existe em
 * `auth.users` — e num reenvio a pessoa quase sempre já existe, seja porque
 * clicou no primeiro link, seja porque um scanner de e-mail consumiu o token
 * por ela. Nesse caso o que resolve é um link de recuperação: leva para a
 * mesma tela de definir senha e funciona com conta já confirmada.
 */
export async function reenviarConvite(
  email: string,
): Promise<Resultado & { tipo?: "convite" | "recuperacao" }> {
  await exigirChefe();

  const admin = criarClienteAdmin();
  const { error: erroConvite } = await admin.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: urlDeAceite() },
  );

  if (!erroConvite) return { ok: true, tipo: "convite" };

  const jaExiste = erroConvite.message
    .toLowerCase()
    .includes("already been registered");

  if (!jaExiste) {
    return {
      ok: false,
      erro: `Não foi possível reenviar: ${erroConvite.message}`,
    };
  }

  const supabase = await criarClienteServidor();
  const { error: erroRecuperacao } = await supabase.auth.resetPasswordForEmail(
    email,
    { redirectTo: urlDeAceite() },
  );

  if (erroRecuperacao) {
    const limite = erroRecuperacao.status === 429;
    return {
      ok: false,
      erro: limite
        ? "O Supabase bloqueou por limite de envios. O SMTP embutido libera poucos e-mails por hora — espere um pouco ou configure um SMTP próprio."
        : `Não foi possível reenviar: ${erroRecuperacao.message}`,
    };
  }

  return { ok: true, tipo: "recuperacao" };
}

const esquemaMembro = z.object({
  nome: z.string().trim().min(2, "O nome precisa ter ao menos 2 letras."),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  cargo: z.enum(CARGOS),
  funcoes: z
    .array(z.enum(FUNCOES))
    .min(1, "Escolha ao menos uma função para esta pessoa."),
});

function lerFormulario(formData: FormData) {
  return esquemaMembro.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    cargo: formData.get("cargo"),
    funcoes: formData.getAll("funcoes"),
  });
}

/**
 * RF-01.1 / RF-01.2 — convida um membro.
 *
 * Dois sistemas em jogo: `auth.users` (quem pode logar) e `membros` (quem é a
 * pessoa no Steera). O convite cria o primeiro pela API de admin, porque só ela
 * pode criar usuário, e o perfil vem logo em seguida.
 */
export async function convidarMembro(formData: FormData): Promise<Resultado> {
  // Server Function é alcançável por POST direto, não só pela UI: a checagem
  // mora aqui dentro, e o RLS ainda é a última linha.
  await exigirChefe();

  const analise = lerFormulario(formData);
  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0].message };
  }

  const { nome, email, cargo, funcoes } = analise.data;
  const admin = criarClienteAdmin();

  const { data: convite, error: erroConvite } =
    await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: urlDeAceite(),
    });

  if (erroConvite || !convite?.user) {
    const jaExiste =
      erroConvite?.message?.toLowerCase().includes("already been registered") ??
      false;

    return {
      ok: false,
      erro: jaExiste
        ? "Já existe um acesso com esse e-mail."
        : `Não foi possível enviar o convite: ${erroConvite?.message ?? "erro desconhecido"}`,
    };
  }

  const idNovo = convite.user.id;

  const { error: erroPerfil } = await admin
    .from("membros")
    .insert({ id: idNovo, nome, email, cargo });

  if (erroPerfil) {
    // O usuário de autenticação já existe mas ficou sem perfil: ele conseguiria
    // logar e cairia num limbo. Desfaz para não deixar esse estado no sistema.
    await admin.auth.admin.deleteUser(idNovo);
    return {
      ok: false,
      erro: `Convite enviado mas o perfil falhou, e o acesso foi desfeito: ${erroPerfil.message}`,
    };
  }

  const { error: erroFuncoes } = await admin
    .from("membro_funcoes")
    .insert(funcoes.map((funcao) => ({ membro_id: idNovo, funcao })));

  if (erroFuncoes) {
    return {
      ok: false,
      erro: `Membro criado, mas as funções não foram salvas: ${erroFuncoes.message}. Edite o membro para ajustar.`,
    };
  }

  revalidatePath("/equipe");
  return { ok: true };
}

/** RF-01.2 — edita nome, cargo e funções. Só o Chefe. */
export async function atualizarMembro(
  membroId: string,
  formData: FormData,
): Promise<Resultado> {
  await exigirChefe();

  const analise = lerFormulario(formData);
  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0].message };
  }

  const { nome, cargo, funcoes } = analise.data;
  const supabase = await criarClienteServidor();

  const { error: erroMembro } = await supabase
    .from("membros")
    .update({ nome, cargo })
    .eq("id", membroId);

  if (erroMembro) return { ok: false, erro: erroMembro.message };

  // Troca o conjunto inteiro: é mais simples e mais previsível do que calcular
  // a diferença, e são no máximo quatro linhas por pessoa.
  const { error: erroRemocao } = await supabase
    .from("membro_funcoes")
    .delete()
    .eq("membro_id", membroId);

  if (erroRemocao) return { ok: false, erro: erroRemocao.message };

  const { error: erroFuncoes } = await supabase
    .from("membro_funcoes")
    .insert(funcoes.map((funcao) => ({ membro_id: membroId, funcao })));

  if (erroFuncoes) return { ok: false, erro: erroFuncoes.message };

  revalidatePath("/equipe");
  return { ok: true };
}

/**
 * RF-01.4 — desativa ou reativa.
 *
 * Nunca apaga: o membro desligado precisa continuar aparecendo nas etapas que
 * concluiu, senão o histórico passa a mentir.
 */
export async function alternarAtivo(
  membroId: string,
  ativo: boolean,
): Promise<Resultado> {
  const chefe = await exigirChefe();

  if (membroId === chefe.id && !ativo) {
    return {
      ok: false,
      erro: "Você não pode desativar o próprio acesso.",
    };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("membros")
    .update({ ativo })
    .eq("id", membroId);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/equipe");
  return { ok: true };
}

/** RF-01.5 — cada pessoa edita o próprio nome. Cargo e funções, só o Chefe. */
export async function atualizarMeuNome(formData: FormData): Promise<Resultado> {
  const membro = await exigirMembro();

  const analise = z
    .string()
    .trim()
    .min(2, "O nome precisa ter ao menos 2 letras.")
    .safeParse(formData.get("nome"));

  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0].message };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("membros")
    .update({ nome: analise.data })
    .eq("id", membro.id);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * RF-01.3 — troca a foto.
 *
 * O arquivo chega já redimensionado pelo navegador (ver campo-foto.tsx), então
 * aqui não há processamento de imagem: só validação e upload.
 */
export async function atualizarFoto(
  membroId: string,
  formData: FormData,
): Promise<Resultado> {
  const atual = await obterMembroAtual();
  if (!atual) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const ehOutraPessoa = atual.id !== membroId;
  if (ehOutraPessoa && atual.cargo !== "CHEFE") {
    return { ok: false, erro: "Você só pode trocar a sua própria foto." };
  }

  const arquivo = formData.get("foto");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, erro: "Nenhuma imagem foi enviada." };
  }

  const extensao = extensaoDeImagem(arquivo.type);
  if (!extensao) {
    return { ok: false, erro: "Use uma imagem JPG, PNG ou WebP." };
  }

  const supabase = await criarClienteServidor();

  // Busca o caminho antigo antes de sobrescrever, para poder limpar depois.
  const { data: anterior } = await supabase
    .from("membros")
    .select("foto_path")
    .eq("id", membroId)
    .single();

  const caminho = caminhoAvatar(membroId, extensao);

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET_AVATARES)
    .upload(caminho, arquivo, { contentType: arquivo.type, upsert: true });

  if (erroUpload) {
    return { ok: false, erro: `Falha ao enviar a imagem: ${erroUpload.message}` };
  }

  const { error: erroPerfil } = await supabase
    .from("membros")
    .update({ foto_path: caminho })
    .eq("id", membroId);

  if (erroPerfil) {
    await supabase.storage.from(BUCKET_AVATARES).remove([caminho]);
    return { ok: false, erro: erroPerfil.message };
  }

  // A foto antiga só sai depois que a nova está gravada no perfil. Se a limpeza
  // falhar, sobra um arquivo órfão — chato, mas melhor que perder a foto viva.
  if (anterior?.foto_path) {
    await supabase.storage.from(BUCKET_AVATARES).remove([anterior.foto_path]);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Alfabeto sem caracteres ambíguos.
 *
 * A senha vai ser lida em voz alta ou digitada de um print — zero, O, um, l e I
 * viram erro de digitação e uma ligação para perguntar "é ele ou i?".
 */
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function gerarSenha(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const bruta = [...bytes].map((b) => ALFABETO[b % ALFABETO.length]).join("");
  // Em blocos de 4: quem digita de um print não se perde no meio.
  return bruta.match(/.{1,4}/g)!.join("-");
}

/**
 * RF-01.1 — cria o acesso sem passar por e-mail.
 *
 * Existe porque o SMTP embutido do Supabase só entrega para membros da
 * organização, e configurar SMTP próprio é trabalho desproporcional para uma
 * equipe de poucas pessoas. Aqui o Chefe recebe uma senha provisória e a repassa
 * pelo canal que a equipe já usa.
 *
 * A senha é gerada pelo sistema, não escolhida pelo Chefe: senha escolhida na
 * pressa é senha fraca, e ele não deveria carregar essa decisão.
 */
export async function criarAcessoDireto(
  formData: FormData,
): Promise<Resultado & { senha?: string }> {
  await exigirChefe();

  const analise = lerFormulario(formData);
  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0].message };
  }

  const { nome, email, cargo, funcoes } = analise.data;
  const admin = criarClienteAdmin();
  const senha = gerarSenha();

  const { data: criado, error: erroCriacao } = await admin.auth.admin.createUser(
    {
      email,
      password: senha,
      // Sem e-mail para confirmar, o acesso já nasce confirmado — senão a
      // pessoa receberia "confirme seu e-mail" num endereço que nunca recebeu
      // nada.
      email_confirm: true,
    },
  );

  if (erroCriacao || !criado?.user) {
    const jaExiste =
      erroCriacao?.message?.toLowerCase().includes("already been registered") ??
      false;

    return {
      ok: false,
      erro: jaExiste
        ? "Já existe um acesso com esse e-mail."
        : `Não foi possível criar o acesso: ${erroCriacao?.message ?? "erro desconhecido"}`,
    };
  }

  const idNovo = criado.user.id;

  const { error: erroPerfil } = await admin
    .from("membros")
    .insert({ id: idNovo, nome, email, cargo });

  if (erroPerfil) {
    // Mesmo cuidado do convite: acesso sem perfil deixaria a pessoa num limbo.
    await admin.auth.admin.deleteUser(idNovo);
    return {
      ok: false,
      erro: `O perfil falhou e o acesso foi desfeito: ${erroPerfil.message}`,
    };
  }

  const { error: erroFuncoes } = await admin
    .from("membro_funcoes")
    .insert(funcoes.map((funcao) => ({ membro_id: idNovo, funcao })));

  if (erroFuncoes) {
    return {
      ok: false,
      erro: `Acesso criado, mas as funções não foram salvas: ${erroFuncoes.message}. Edite o membro para ajustar.`,
    };
  }

  revalidatePath("/equipe");
  return { ok: true, senha };
}

/** Gera uma senha nova para quem perdeu a que recebeu. */
export async function redefinirSenhaDireto(
  membroId: string,
): Promise<Resultado & { senha?: string }> {
  await exigirChefe();

  const admin = criarClienteAdmin();
  const senha = gerarSenha();

  const { error } = await admin.auth.admin.updateUserById(membroId, {
    password: senha,
  });

  if (error) {
    return { ok: false, erro: `Não foi possível trocar a senha: ${error.message}` };
  }

  return { ok: true, senha };
}

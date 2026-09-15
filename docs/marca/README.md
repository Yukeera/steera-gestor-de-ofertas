# Marca do Steera

Arte-fonte e construção da marca. Quem for desenhar peça nova (ícone de app,
assinatura de e-mail, material impresso) lê isto antes.

## Arquivos

| Arquivo | O que é |
|---|---|
| `origem-autotrace.svg` | **Arquivo de origem, não de uso.** Autotrace do raster escolhido no Ideogram: 102 paths, ~60 tons de âmbar quase idênticos, fundo embutido, 75KB. Guardado só como procedência — foi dele que a geometria foi medida. |
| `../../src/components/marca.tsx` | **A marca de verdade.** `LogoSteera` (só o símbolo) e `MarcaSteera` (símbolo + palavra). |
| `../../src/app/icon.svg` | Favicon: quadrado navy + símbolo, com as cores fixas. |

Por que não usar o autotrace direto: ele não herda `currentColor` (não
acompanharia tema claro/escuro), e o ruído de bezier da vetorização automática
vira mancha abaixo de ~40px.

## Construção

A marca é uma **correia transportadora**: dois roletes e a fita tangenciando os
dois. Não é um "S" decorativo com enfeites — a forma sai da mecânica, e é isso
que amarra a marca ao vocabulário do produto (esteira, rolete, montagem).

Caixa de desenho **70 × 100**, com a arte encostando nas quatro bordas.
Simetria de rotação de 180° em torno de (35, 50) — tudo que vale para cima vale
espelhado para baixo.

| Elemento | Valor |
|---|---|
| Raio dos roletes (linha de centro da fita) | 22,1 |
| Espessura da fita | 11,8 → raio externo 28 |
| Centro do rolete de cima | (28, 28) |
| Centro do rolete de baixo | (42, 72) |
| Tangência da fita | 315° (cima) e 135° (baixo) |
| Ponta dos rabos | (65,8; 33,8) e (4,2; 66,2) |
| Cruzamento dos arcos | 70° e 250° |
| Polias | `r` 8,2 com traço 6,4 → externo 11,4, furo 5,0 |

**A fita é um caminho único, não dois arcos colados.** Subpaths separados deixam
uma costura de um pixel na cintura do S. Se for redesenhar, mantenha contínuo.

Os dois arcos usam as mesmas flags (`1 0`): rotação de 180° preserva o sentido
de giro, então o arco de baixo **não** inverte o `sweep-flag`.

## Desvio proposital da arte original

O furo das polias foi aberto de 4,4 para 5,0, mantendo o diâmetro externo.

No desenho original o furo fechava abaixo de ~24px e a marca virava mancha — e
a barra lateral usa 24px, o favicon 16–32px. Em tamanho grande a diferença é
indistinguível.

Fora isso a reconstrução bate com a arte original com **4,3% de diferença de
área**, e esses 4% são a tremedeira do próprio autotrace mais o corte da ponta
do rabo.

## Regras de uso

- **Cor:** o símbolo usa `currentColor`. Nas telas ele vai em `text-marca`
  (`--marca`: `#d97706` no claro, `#f59e0b` no escuro). Nunca pintar de outra
  cor da paleta.
- **Tamanho mínimo:** 24px de altura. Abaixo disso os furos das polias fecham.
  Em 16px ela não lê — é limite do desenho, não da vetorização. Se algum dia
  precisar de 16px de verdade, o caminho é uma variante simplificada, não
  espremer esta.
- **Dimensionar pela altura**, largura em `auto` (a proporção é 0,70). A caixa é
  justa, então `size-*` do Tailwind deixaria sobra lateral.
- **Não** aplicar sombra, gradiente ou contorno; **não** girar; **não** separar
  os roletes da fita; **não** redesenhar a palavra "Steera" — ela é
  Fira Sans semibold com `tracking-tight`, ver [DESIGN.md §3](../DESIGN.md).

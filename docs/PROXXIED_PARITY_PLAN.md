# Plano de Paridade com Proxxied

Este documento transforma o Proxxied em referencia de produto para o DeckFill.
O objetivo nao deve ser copiar marca, textos, imagens, logo ou codigo proprietario.
O objetivo e atingir paridade funcional: o usuario deve conseguir fazer no DeckFill
o mesmo fluxo de trabalho que consegue fazer no Proxxied, com identidade propria.

Fontes usadas nesta primeira analise:

- Site: https://proxxied.com/
- Repositorio publico: https://github.com/kclipsto/proxies-at-home
- README do projeto: https://github.com/kclipsto/proxies-at-home#readme

## Resumo Executivo

O Proxxied nao e apenas um gerador de PDF. Ele e um ambiente completo de
preparacao de proxies:

- Entrada por decklist, URL, XML do MPC Autofill e upload de imagens.
- Busca e selecao de artes por Scryfall e MPC Autofill.
- Controle de tokens, promos, idiomas, cartas dupla-face e cardbacks.
- Biblioteca local/cache de imagens, uploads e projetos.
- Grade visual com ordenacao manual, filtros e reordenacao.
- Motor de layout com unidades, presets de pagina, sangria, guias, offsets,
  duplex e marcas para cortadoras.
- Exportacao para PDF, imagens, ZIP, decklist, MPC IDs e template SVG de corte.
- App instalavel/PWA/Electron, com defaults salvos e reset de dados.

A conclusao principal: antes de mexer de novo na aparencia, precisamos
reestruturar o produto em torno de tres motores:

1. Motor de importacao e busca.
2. Motor de projeto/cartas/artes.
3. Motor de layout/exportacao.

So depois disso o frontend deve ser redesenhado com seguranca.

## Funcionalidades Confirmadas no Proxxied

### 1. Tipos de Cartas e Tamanhos

- Magic: The Gathering.
- Pokemon TCG.
- Yu-Gi-Oh!.
- Cartas customizadas.
- Tarot/oracle cards.
- Playing cards.
- Tamanho padrao de carta exibido como 63.0mm x 88.0mm.
- Unidades alternaveis entre polegadas e milimetros.
- Largura/altura customizaveis.

### 2. Entrada e Importacao

- Upload de imagens.
- Auto detect bleed para uploads.
- Importacao por URL de Archidekt.
- Importacao por URL de Moxfield.
- Importacao de XML do MPC Autofill.
- Entrada por decklist.
- Formatos aceitos com quantidade, nome, set e collector number.
- Sintaxe para token-focused lookup, por exemplo `t:Nome`.
- Categorias finais entre colchetes podem ser ignoradas no import.
- Advanced Search.
- Fetch Cards.
- Clear Cards.
- Add Associated Tokens.
- Auto-Import Associated Tokens.
- Include Promotional Printing.

### 3. Fontes de Arte e Selecao

- Preferred Art Source: Scryfall ou MPC Autofill.
- Seletor de artes alternativas.
- Busca por todas as impressoes disponiveis.
- Integração com biblioteca de artes do MPC Autofill.
- Upload library para imagens proprias.
- Reuso/caching de imagens.
- DFC com faces gerenciadas automaticamente.
- Selecao independente de arte por face.
- Cardback library com versos built-in e customizados.
- Verso global ou por carta.
- Suporte a tokens associados.
- Suporte a idiomas para Scryfall.

### 4. Gerenciamento do Projeto

- Projeto atual com nome editavel.
- Multi-project: criar, renomear, trocar e excluir projetos.
- Ultimo projeto lembrado.
- Compartilhamento por URL unica.
- Drag and drop na grade.
- Multi-select para acoes em massa.
- Undo/redo.
- Filtros e ordenacao.
- Defaults do usuario: salvar como padrao, resetar para padrao, restaurar fabrica.
- Reset App Data.
- Processing notifications.

### 5. Layout de Pagina

- Presets de pagina: Letter no site e outros no README, como A4, A3, Tabloid,
  Legal, ArchA, ArchB, SuperB, A2 e A1.
- Largura e altura customizadas.
- Swap orientation.
- Columns e rows configuraveis.
- Card spacing horizontal e vertical.
- Unlink de espaçamento X/Y.
- Calculo do maximo que cabe no layout atual.
- Card position adjustment.
- Offset horizontal e vertical.
- Separate Back Offset para alinhamento de versos em duplex.

### 6. Sangria e Processamento Visual

- Bleed Width em mm.
- Ajuda contextual explicando sangria.
- Configuracoes separadas para imagens com bleed e sem bleed.
- Modos de bleed: gerar, cortar/trimar bleed existente ou nao usar bleed.
- Auto-detect de imagens pre-bleeded.
- Ajustes por carta/face.
- Darken Pixels.
- Modos de escurecimento: none/darken/contrast edges/contrast full, conforme README.
- Aplicar efeitos em Scryfall, MPC Autofill, uploads e cardbacks.
- Amount, edge width e auto detect.
- Brilho, contraste, saturacao, sharpness, pop/punch, noise reduction e gamma
  correction conforme README.
- Renderizacao WebGL/PixiJS para preview em tempo real, conforme README.

### 7. Guias, Corte e Duplex

- Guide color.
- Guide width em pixels.
- Placement: outside, inside ou center.
- Card cut guides.
- Estilos de guias: corners, full, solid, dashed, square, round.
- Guide length.
- Page cut guides com full lines.
- Opcoes especificas para duplex:
  - esconder guias de carta nas frentes;
  - esconder guias de pagina nas frentes;
  - esconder guias de carta nos versos;
  - esconder guias de pagina nos versos.
- Registration marks.
- Electronic cutter: none, Silhouette, Siser Juliet beta.
- Recomendacoes de Silhouette Studio no proprio site.
- SVG cutting template para importar em software de corte.

### 8. Filtros e Ordenacao

- Sort by manual.
- Mana value: 0, 1, 2, 3, 4, 5, 6, 7+.
- Filtro por cores.
- Match type: partial ou exact.
- Ordenacao de decklist/export: as displayed ou alphabetical.
- README tambem cita filtros por tipo, raridade e custom back.

### 9. Exportacao

- Export to PDF.
- PDF Export DPI, com opcao 900 Sharp vista no site.
- README tambem cita exportacao high-resolution ate 1200 DPI.
- Export page range.
- Fronts only.
- Export card images.
- ZIP archive.
- Copy decklist.
- Copy/download decklist with MPC art IDs.
- Copy decklist order: as displayed ou alphabetical.
- MPC Autofill XML, conforme README.
- SVG cutting template.
- Export modes citados no README:
  - fronts only;
  - interleaved all;
  - interleaved DFC/custom only;
  - duplex;
  - backs only;
  - visible faces.

### 10. App, Legal e Suporte

- No account required, conforme texto publico do site.
- PWA instalavel e modo offline, conforme README.
- Electron desktop para Windows, macOS e Linux, conforme README.
- Dark/light mode.
- Shortcuts e acessibilidade para drag and drop.
- Privacy Policy e Terms of Service.
- Aviso de nao afiliacao com Wizards of the Coast, Konami ou The Pokemon Company.

## Lacunas Ainda Nao Confirmadas

Algumas partes podem existir mas nao foram totalmente verificadas no site publico
sem interacao profunda:

- Fluxo completo de cada modal.
- Comportamento exato do editor avancado por carta.
- Como o compartilhamento por URL persiste dados.
- Limites reais da API e do cache.
- Formato exato do XML MPC exportado.
- Se Pokemon e Yu-Gi-Oh! tem paridade real com Magic ou se sao mais simples.
- Qual a versao mais atual do app, pois GitHub e pagina de releases exibiram
  sinais inconsistentes durante a pesquisa.

Essas lacunas devem virar uma segunda rodada de investigacao antes da implementacao
das fases finais.

## Comparacao com o DeckFill Hoje

### O DeckFill ja tem

- Backend FastAPI.
- Base local de Magic via Scryfall.
- Suporte inicial para Pokemon e Yu-Gi-Oh!.
- Parser de decklist.
- Busca e visualizacao de cartas.
- Selecao de artes/reimpressões para Magic.
- Upload local de imagens no frontend.
- PDF no navegador com jsPDF.
- Opcoes de pagina, escala, espacamento, sangria, guias e versos.
- Modo profissional inicial.
- Fluxo inicial de WhatsApp.
- Documentacao inicial de produto, arquitetura e roadmap.

### Maiores gaps

- Falta modelo de projeto persistente.
- Falta biblioteca/cache local de imagens e uploads.
- Falta importacao por URL e XML.
- Falta MPC Autofill.
- Falta motor robusto de tokens/partes associadas.
- Falta DFC completo por face, verso e export.
- Falta editor por carta/face.
- Falta print engine mais preciso e testavel.
- Falta SVG de corte.
- Falta drag/drop, multi-select, filtros e undo/redo.
- Falta padrao de estado para suportar um frontend maior.
- Pokemon/Yu-Gi-Oh! ainda nao parecem confiaveis o bastante para demo comercial.

## Plano de Execucao

### Fase 0 - Congelar Aparencia e Organizar Base

Objetivo: parar de redesenhar antes do produto estar arquitetado.

- Manter aparencia antiga por enquanto.
- Corrigir comandos de execucao e problema da porta 3000 quando ela estiver presa.
- Criar matriz de funcionalidades Proxxied x DeckFill.
- Criar tipos/estruturas centrais:
  - Project;
  - CardEntry;
  - CardFace;
  - ArtSource;
  - CardBack;
  - PrintLayoutSettings;
  - ExportSettings.
- Separar frontend em modulos claros antes de crescer a UI.

### Fase 1 - Busca e Importacao Confiaveis

Objetivo: nenhuma demo deve falhar no basico.

- Melhorar parser universal de decklist.
- Magic:
  - nome exato/fuzzy;
  - set code;
  - collector number;
  - promos;
  - idioma;
  - tokens;
  - DFC;
  - all_parts do Scryfall.
- Pokemon:
  - parser proprio;
  - set/numero;
  - variantes;
  - cache;
  - fallback quando API externa falhar.
- Yu-Gi-Oh!:
  - parser proprio;
  - IDs/codigos;
  - Main/Extra/Side;
  - cache;
  - fallback quando API externa falhar.
- Mostrar placeholder claro para cartas nao encontradas.
- Criar testes para exemplos reais e cartas problematicas.

### Fase 2 - Projeto, Grade e Revisao

Objetivo: transformar lista em projeto editavel.

- Criar estado persistente por projeto.
- Criar quantidade por carta sem duplicar manualmente tudo no DOM.
- Drag/drop de cartas.
- Duplicar/remover carta.
- Multi-select.
- Undo/redo.
- Filtro por texto, TCG, cor/tipo/raridade quando aplicavel.
- Ordenacao manual e alfabetica.
- Destaque de duplicadas.
- Resumo de cartas, erros e pendencias.

### Fase 3 - Artes, Uploads e Versos

Objetivo: o usuario escolher exatamente o que sera impresso.

- Seletor de artes por carta.
- Agrupar reimpressoes por set.
- Favoritar artes.
- Upload persistente.
- Upload ZIP.
- Front/back pairs.
- Biblioteca de cardbacks.
- Verso global e verso por carta.
- DFC com face independente.
- Tokens e partes associadas como cards vinculados.
- Para Lukamina e casos parecidos: mostrar pilha/galeria de faces, tokens e partes
  vinculadas, mas so depois de estar bem especificado.

### Fase 4 - Motor de Impressao e Exportacao

Objetivo: chegar perto do Proxxied onde mais importa para quem imprime.

- Reescrever configuracoes de layout em um modelo unico.
- Presets de pagina.
- Unidades mm/in.
- Card size customizado.
- Linhas/colunas.
- Espacamento X/Y independente.
- Sangria:
  - sem bleed;
  - gerar bleed;
  - usar bleed existente;
  - trimar bleed;
  - auto-detect.
- Offset frontal.
- Offset de verso separado.
- Duplex:
  - fronts only;
  - backs only;
  - duplex;
  - interleaved;
  - visible faces.
- Guia:
  - cor;
  - largura;
  - inside/outside/center;
  - corner/full;
  - solid/dashed;
  - square/round;
  - comprimento.
- Registration marks.
- Presets Silhouette.
- Preset Siser Juliet.
- Exportar SVG cutting template.
- Exportar card images e ZIP.
- Exportar decklist com IDs de arte.
- Criar testes/golden files para tamanho real, sangria, offset e duplex.

### Fase 5 - MPC Autofill e Fontes Externas

Objetivo: ter a mesma liberdade de artes que os usuarios de proxy esperam.

- Integrar busca MPC Autofill.
- Alternar fonte preferida: Scryfall ou MPC Autofill.
- Preservar IDs de arte.
- Exportar XML MPC.
- Importar XML MPC.
- Controlar qualidade/DPI/source/tags quando a fonte permitir.

### Fase 6 - Multi-TCG e Cartas Customizadas

Objetivo: sair de Magic-only de forma seria.

- Pokemon com artes/variantes e regras proprias de parser.
- Yu-Gi-Oh! com Main/Extra/Side e IDs.
- Templates customizados.
- Tamanhos customizados.
- Tarot/oracle.
- Playing cards.
- Cada TCG deve ter configuracoes proprias: nao mostrar opcoes que nao fazem
  sentido para aquele jogo.

### Fase 7 - Fluxo Comercial Para Parceiro

Objetivo: diferenciar o DeckFill de uma copia simples do Proxxied.

- Portal de pedido.
- Dados do cliente.
- Observacoes.
- Estimativa de quantidade/preco.
- Envio via WhatsApp.
- Painel de pedidos.
- Status do pedido.
- Preset por parceiro.
- PDF/export interno para o profissional.
- Historico de pedidos.

### Fase 8 - Redesign Profissional

Objetivo: redesenhar depois que a estrutura estiver certa.

- Nao redesenhar o app inteiro de uma vez.
- Primeiro definir fluxos:
  - criar projeto;
  - importar cartas;
  - revisar;
  - escolher artes;
  - configurar impressao;
  - exportar/enviar pedido.
- Criar layout em modo produto, nao landing page.
- Fazer componentes reaproveitaveis:
  - painel lateral;
  - toolbar de cartas;
  - cards de preview;
  - editor por carta;
  - painel de exportacao;
  - painel de pedido.
- Validar com screenshots desktop/mobile antes de considerar pronto.

## Primeiro Passo Recomendado

O primeiro passo nao deve ser frontend visual. Deve ser a Fase 0 + inicio da Fase 1:

1. Criar uma matriz `DeckFill x Proxxied` com status por funcionalidade.
2. Definir os modelos centrais de dados.
3. Melhorar busca/importacao de Magic, Pokemon e Yu-Gi-Oh!.
4. Criar testes para casos reais.
5. So depois mexer na UI, com base nesses fluxos.

Isso evita repetir o erro de redesenhar a tela por fora enquanto a experiencia
principal ainda nao esta forte.

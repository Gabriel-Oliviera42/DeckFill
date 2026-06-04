# Estratégia de Parceiro

## Contexto

O DeckFill começou como uma ferramenta para qualquer pessoa gerar seus próprios PDFs de proxy. A oportunidade atual aponta para outro caminho: transformar o app em um fluxo de pedido para uma pessoa que já trabalha com proxies.

O parceiro citou como referência o projeto `silhouette-card-maker`, que já resolve bem a etapa de PDF/corte com máquina Silhouette. Isso sugere que a dor principal talvez não seja "como cortar", mas "como receber pedidos melhores".

## Evidências Da Conversa

Pontos úteis já apareceram na conversa:

- O parceiro elogiou o uso do Scryfall e a experiência atual do site.
- Ele disse que não usa MTG Print porque precisa que a impressão saia diagramada para cortadora automática.
- Ele apontou bug/risco em cartas dupla-face: versos de Tovolar e Westvale Abbey não puxaram corretamente no exemplo.
- Ele propôs a MarraPrints como empresa oficial de impressão, com possibilidade de comissão de 10% da receita gerada pelo site.
- Ele afirmou que o `silhouette-card-maker` já atende bastante bem o fluxo atual dele.
- No teste do modo profissional, ele não conseguiu ativar sangria e alertou que 1 mm de diferença na impressão pode estragar o resultado.

Leitura: para esse parceiro, sangria, tolerância e corte são assuntos críticos. Se o DeckFill oferecer modo profissional, ele precisa ser calibrável e validado com o equipamento real.

## Direção Recomendada

A melhor aposta inicial é posicionar o DeckFill como portal de pedidos e revisão visual, não como substituto direto da ferramenta de corte.

Fluxo ideal:

```text
Cliente cola decklist
→ escolhe TCG
→ sistema encontra cartas
→ cliente revisa imagens/quantidades
→ cliente adiciona observações
→ pedido é enviado para o parceiro
→ parceiro produz usando o fluxo dele
```

## O Que Mostrar Para Impressionar

Para uma primeira demo, as prioridades devem ser:

1. Busca confiável para Magic, Pokémon e Yu-Gi-Oh!.
2. Frontend mais profissional, com cara de pedido real.
3. Revisão visual clara antes de enviar.
4. Resumo do pedido: TCG, quantidade de cartas, cartas não encontradas, observações.
5. Envio pelo WhatsApp com mensagem estruturada.
6. Modo profissional com sangria configurável ou preset MarraPrints validado.
7. Tratamento confiável de cartas dupla-face.

PDF perfeito ainda importa, mas pode aparecer como recurso do parceiro ou do admin, não como primeira tela do cliente.

## Modelo de Negócio Ainda Aberto

As opções mais prováveis são:

- Parceria por pedido: o DeckFill ajuda a captar/organizar pedidos e recebe uma parte.
- Licença mensal: o parceiro paga para usar uma versão configurada para o fluxo dele.
- Ferramenta sob medida: você vende uma versão inicial personalizada.
- Produto SaaS: vários profissionais usam seus próprios presets.

Neste momento, o melhor é não decidir cedo demais. Primeiro vale descobrir se o parceiro pagaria por:

- Menos tempo organizando pedido.
- Menos erro de carta.
- Menos conversa manual.
- Mais pedidos vindos por um link próprio.
- Mais facilidade para clientes leigos.

## Produto Mínimo Para Conversa Comercial

O MVP de conversa deveria ter:

- Página inicial já como formulário de pedido.
- Seleção de Magic, Pokémon e Yu-Gi-Oh!.
- Campo de decklist.
- Resultado visual bonito.
- Alertas de cartas não encontradas.
- Campo de nome/contato/observações.
- Botão "Enviar pedido".
- Mensagem de WhatsApp estruturada com resumo e lista.
- Alerta claro quando uma carta não tem verso/imagem correta.
- Opção de sangria/preset profissional sem travar uma necessidade real do parceiro.

## Coisas Para Não Prometer Agora

- Que substitui o fluxo atual de Silhouette.
- Que resolve todos os formatos de decklist de todos os TCGs.
- Que é legalmente autorizado por marcas de TCG.
- Que gera corte perfeito sem calibrar com o equipamento real.
- Que o PDF final está pronto para qualquer gráfica.

## Perguntas Para o Parceiro

Estas são as perguntas que mais reduzem incerteza:

1. Hoje, de onde vêm os pedidos: WhatsApp, Instagram, Discord, loja, grupo?
2. O que mais dá trabalho: entender lista, procurar imagem, montar PDF, cortar, cobrar ou enviar?
3. Ele quer que o cliente gere arquivo ou só envie pedido?
4. Qual formato ele prefere receber: texto, PDF, imagens, planilha, link ou pedido no painel?
5. Ele usa `silhouette-card-maker` com quais configurações?
6. Ele aceita pedido de quais jogos hoje?
7. Como ele calcula preço?
8. Quais erros de cliente mais atrapalham?
9. Qual sangria ele usa hoje?
10. Qual tolerância de corte/impressão ele considera aceitável?
11. O modo profissional deve deixar o cliente mexer na sangria ou só o parceiro?

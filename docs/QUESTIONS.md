# Perguntas Abertas

Estas perguntas servem para decidir a próxima direção do DeckFill antes de implementar muitas features.

## Produto

1. O cliente deve conseguir gerar PDF sozinho ou apenas montar/revisar o pedido?
2. O PDF final deve ficar disponível só para o parceiro/admin?
3. O nome final é DeckFill ou você quer testar outro nome mais comercial?
4. O objetivo é vender o projeto inteiro, vender licença de uso, fazer parceria ou oferecer como serviço?
5. O produto deve ser um link público do parceiro, tipo "faça seu pedido aqui"?

## Parceiro de Proxy

1. Essa pessoa imprime com qual equipamento: impressora comum, gráfica, guilhotina, Silhouette, Cricut ou outro fluxo?
2. Ela precisa de PDF A4, A3, folha adesiva, frente e verso, marcas de registro ou algum padrão específico?
3. Ela prefere receber arquivo pronto, decklist revisada ou pedido com informações organizadas?
4. Ela cobra por carta, por folha, por deck ou por pedido?
5. O WhatsApp deve ser só contato inicial ou virar fluxo completo de pedido?
6. O que o `silhouette-card-maker` já resolve perfeitamente para ela?
7. O que ainda dá trabalho mesmo usando essa ferramenta?

## Impressão

1. Qual tamanho real as proxies devem ter para cada TCG?
2. O modo profissional 4x2 em A4 landscape está correto para o parceiro?
3. Qual gap ideal entre cartas?
4. Sangria deve ser obrigatória, opcional ou controlada pelo parceiro?
5. As marcas de registro atuais batem com a máquina real?
6. Precisa imprimir verso alinhado na mesma folha ou em arquivo separado?
7. Qual sangria ele usa hoje no fluxo atual?
8. O que acontece quando a impressão desloca 1 mm: precisa de borda preta, sangria maior ou recalibração?
9. Quais cartas dupla-face ele usa para testar frente/verso?

## Features

1. A próxima feature mais importante é busca multi-TCG confiável, pedido via WhatsApp, melhoria visual, painel do parceiro ou upload persistente?
2. Você quer salvar decks/projetos localmente?
3. O usuário deve poder escolher artes em lote?
4. Precisa importar listas de Moxfield, Archidekt, LigaMagic, Pokémon, Yu-Gi-Oh!, YDK ou Limitless?
5. Precisa exportar PNGs individuais além do PDF?
6. Precisa de templates de verso personalizados por cliente/parceiro?

## Técnico

1. Você quer manter frontend vanilla ou migrar para React/Vite?
2. O backend será local, hospedado no Render, ou em outro serviço?
3. O banco `cards.db` deve ser gerado pelo usuário ou distribuído pronto?
4. Você quer autenticação/login?
5. Você quer que uploads fiquem no servidor, no navegador ou em storage externo?
6. Você quer transformar os testes em `pytest` antes de mexer nas features maiores?

## Comercial e Jurídico

1. Você quer vender isso como ferramenta de organização/preparação de arquivo ou como serviço de proxy?
2. Como você quer lidar com avisos sobre marcas, imagens e uso casual/playtest?
3. O parceiro já tem um público e volume de pedidos?
4. Quanto tempo manual o parceiro gasta hoje por pedido?
5. Que problema faria essa pessoa pagar pelo DeckFill?
6. A proposta de comissão de 10% seria sobre receita bruta, lucro, pedidos originados pelo site ou outro critério?
7. MarraPrints deve aparecer como parceira oficial, recomendação ou opção de orçamento?

# Roadmap

Este roadmap é uma proposta inicial baseada no estado atual do projeto. Ele deve ser ajustado depois das respostas em `docs/QUESTIONS.md`.

## Fase 0 - Base do Projeto

Objetivo: deixar claro o que existe, o que falta e qual é a direção do produto.

- Criar documentação atual.
- Separar estado atual de ideias futuras.
- Definir público principal: jogador final, profissional de proxy ou ambos.
- Definir nome, posicionamento e pitch.
- Validar riscos comerciais e legais antes de prometer uso profissional.

## Fase 1 - Confiabilidade do MVP

Objetivo: transformar o projeto funcional em algo confiável para demo.

- Corrigir documentos antigos ou movê-los para histórico.
- Limpar arquivos binários versionados/presentes indevidamente.
- Reduzir logs de debug em produção.
- Corrigir/validar cartas dupla-face como Tovolar e Westvale Abbey.
- Revisar sangria no modo profissional.
- Criar suíte de testes automatizada para parser, providers e endpoints.
- Criar testes de geração de PDF com cenários básicos.
- Validar `cards.db` e instruções de setup em máquina limpa.
- Revisar CORS e variáveis de ambiente.

## Fase 2 - Busca Multi-TCG Confiável

Objetivo: fazer Magic, Pokémon e Yu-Gi-Oh! funcionarem bem o suficiente para uma demo séria.

- Melhorar parser por TCG.
- Aceitar formatos comuns de lista de cada jogo.
- Adicionar cache para Pokémon e Yu-Gi-Oh!.
- Melhorar ranking de resultado: exato, edição, número, idioma e imagem.
- Mostrar alternativas quando houver ambiguidade.
- Criar testes para cartas famosas, nomes parciais, acentos e falhas.
- Marcar cartas não encontradas de forma clara.

## Fase 3 - MVP Para Parceiro de Proxy

Objetivo: criar uma versão que faça sentido para apresentar a quem imprime proxies.

- Transformar a primeira tela em fluxo de pedido, não em painel técnico de PDF.
- Criar campos de cliente: nome, contato e observações.
- Criar resumo do pedido: jogo, quantidade, cartas não encontradas e observações.
- Criar botão de envio com mensagem completa para WhatsApp.
- Remover telefone fixo do código e colocar configuração de parceiro.
- Manter PDF como recurso interno/admin ou opção avançada.
- Criar tela ou modal de revisão antes de gerar/enviar.

## Fase 4 - Frontend Profissional

Objetivo: fazer o app parecer produto, não protótipo.

- Redesenhar a interface como fluxo de pedido.
- Separar visão do cliente e visão avançada/admin.
- Melhorar estados vazios, loading, erro e revisão.
- Criar cards de resultado mais claros.
- Mostrar progresso e qualidade de busca por TCG.
- Trocar textos técnicos por linguagem de pedido.
- Padronizar cores, espaçamento e hierarquia visual.

## Fase 5 - Upload e Artes Customizadas

Objetivo: permitir fluxo real com artes próprias e persistência.

- Criar endpoint de upload.
- Validar MIME, tamanho e dimensões.
- Redimensionar/processar imagem no backend.
- Persistir uploads com metadados.
- Permitir frente e verso para cartas customizadas.
- Criar limpeza/remoção de imagens.
- Pensar em storage externo se virar SaaS.

## Fase 6 - Compatibilidade Com Produção

Objetivo: conectar o pedido ao fluxo real do parceiro.

- Mapear como o parceiro usa `silhouette-card-maker`.
- Gerar export compatível, se fizer sentido.
- Tornar o modo profissional configurável.
- Criar preset por parceiro: folha, gap, marcas, sangria, verso e instruções.
- Gerar PDF com nome de arquivo útil.
- Validar dimensões, corte, marcas e verso com equipamento real.
- Definir tolerância de corte e margem de segurança.
- Evitar travar controles que o parceiro precisa ajustar, como sangria.

## Fase 7 - Produto Comercial

Objetivo: sair de ferramenta local para produto vendável.

- Login ou área administrativa, se necessário.
- Gestão de pedidos.
- Histórico de PDFs.
- Configuração de parceiro.
- Precificação ou estimativa de orçamento.
- Controle de status: recebido, preparando, impresso, enviado.
- Página pública simples para cliente montar pedido.
- Termos de uso e avisos legais.

## Fase 8 - SaaS ou Licença Para Profissional

Objetivo: escolher modelo de negócio.

Opções:

- Vender como ferramenta local para um parceiro.
- Licenciar por mensalidade para profissionais de proxy.
- Criar SaaS com painel de pedidos.
- Criar versão gratuita para jogadores e versão profissional paga.

Critérios para escolher:

- Quantidade de profissionais interessados.
- Frequência real de pedidos.
- Necessidade de personalização por parceiro.
- Risco legal/comercial.
- Seu tempo disponível para suporte.

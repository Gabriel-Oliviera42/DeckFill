# Arquitetura

## Resumo

O DeckFill é dividido entre:

- Backend FastAPI, responsável por parsear decklists, buscar cartas e expor endpoints.
- Frontend estático, responsável por interação, renderização, uploads locais e geração de PDF.
- Banco SQLite local para Magic, gerado a partir do Scryfall Bulk Data.
- APIs externas para suporte inicial de Pokémon TCG e Yu-Gi-Oh!.

## Fluxo Principal

```text
Usuário cola decklist
→ Frontend envia POST /parse-deck
→ Backend escolhe provider pelo jogo
→ Provider parseia e busca cartas
→ Frontend renderiza grade
→ Usuário escolhe artes/customizações
→ Frontend gera PDF com jsPDF
```

## Backend

### Entrada Principal

`backend/main.py`

Responsabilidades:

- Inicializar FastAPI.
- Configurar CORS.
- Expor health check.
- Receber decklist.
- Delegar parse/busca para providers.
- Retornar cartas normalizadas.
- Servir proxy de imagens externas para contornar CORS na geração de PDF.

### Endpoints

- `GET /`: status simples.
- `GET /health`: verifica conexão com `cards.db`.
- `GET /image-proxy?url=...`: baixa imagens de hosts permitidos.
- `POST /parse-deck`: processa decklist.
- `GET /search/{card_name}`: busca por nome no banco Magic.
- `GET /printings/{card_name}`: lista impressões por nome.
- `GET /cards/{card_id}/printings`: lista impressões por `oracle_id`.
- `GET /stats`: estatísticas do banco Magic.

### Providers

`backend/providers/registry.py` escolhe o provider com base em `game`.

Providers atuais:

- `magic_provider.py`: usa SQLite local.
- `pokemon_provider.py`: usa Pokémon TCG API v2.
- `yugioh_provider.py`: usa YGOPRODeck API.

Todos retornam cartas no formato compatível com `CardResponse`.

## Banco de Dados

`backend/sync_db.py` baixa o Scryfall Bulk Data e cria `cards.db`.

Tabela principal:

- `cards`

Campos relevantes:

- Identificação: `id`, `oracle_id`, `name`, `lang`.
- Edição: `set_code`, `set_name`, `collector_number`, `released_at`, `rarity`.
- Texto: `type_line`, `oracle_text`, campos impressos.
- Imagens: frente, verso e art crop.
- Dados DFC: faces e partes serializadas em JSON.

Índices importantes:

- `idx_cards_name`
- `idx_cards_set`
- `idx_cards_oracle_id`
- `idx_cards_lang`
- `idx_cards_set_collector`
- `idx_cards_name_lang`

## Frontend

### Entrada Principal

`frontend/index.html` monta a interface.

`frontend/app.js` ainda centraliza:

- Registro de listeners.
- Referências de elementos DOM.
- Estado de alguns controles.
- Modo profissional.
- Verso global.
- Atualização de cards.
- Exposição de funções globais para debug.

### Módulos em `frontend/js/`

- `core/config.js`: URLs, verso padrão de Magic e decklist exemplo.
- `core/state.js`: estado global.
- `games/game-configs.js`: configurações por TCG.
- `api/api-client.js`: health check.
- `deck/deck-processor.js`: envio de decklist e fluxo de render.
- `deck/card-renderer.js`: cards na grade.
- `cards/card-image-resolver.js`: frente, verso, DFC, reimpressão e imagem customizada.
- `ui/modal-manager.js`: modal de artes e configurações.
- `ui/notifications.js`: loading, erros e progresso.
- `upload/image-upload.js`: upload local de imagens.
- `print/print-settings-reader.js`: leitura bruta de campos da UI.
- `print/print-settings-resolver.js`: resolve conflitos e cria configuração previsível.
- `pdf/pdf-card-list.js`: lista final de cartas imprimíveis.
- `pdf/pdf-layout.js`: cálculo de layout manual/profissional.
- `pdf/pdf-registration-marks.js`: marcas para corte profissional.
- `pdf/pdf-engine.js`: geração do PDF.
- `utils/helpers.js`: processamento de imagem com sangria.

## PDF

O PDF é gerado no navegador com jsPDF.

Modos atuais:

- Manual: auto-fit baseado no tamanho da folha, escala e gap.
- Profissional: preset A4 landscape, grade 4x2, área segura e marcas de registro.

Configurações atuais:

- Tamanho da folha.
- Espaçamento entre cartas.
- Escala.
- Frente e verso.
- Verso global.
- Marcas de corte manuais.
- Sangria.
- Bordas pretas.
- Ignorar terrenos básicos.

## Riscos Técnicos

- `app.js` ainda tem responsabilidades demais.
- Alguns documentos antigos estão desatualizados.
- Testes são scripts manuais e dependem de API rodando.
- Pokémon/Yu-Gi-Oh! dependem de APIs externas sem cache persistente.
- Há arquivos binários grandes presentes no workspace.
- O backend usa CORS aberto para desenvolvimento.
- O fluxo de upload customizado atual fica no navegador; ainda não há persistência real no backend.
- O modo profissional precisa de validação com impressora/cortadora real.


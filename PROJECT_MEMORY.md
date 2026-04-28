# Deck Fill - Project Memory

## Project Overview
**Deck Fill** é uma aplicação web para gerar PDFs de impressão de cartas de TCG (Magic: The Gathering), simulando a arquitetura de sites como MTG Print e MPCFill.

## Tech Stack
- **Backend:** Python com FastAPI
- **Banco de Dados:** SQLite (embutido, rápido para buscas locais)
- **Frontend:** HTML puro, Vanilla JavaScript e Tailwind CSS via CDN
- **PDF Generation:** Client-side usando `jsPDF v2.5.1`

## Architecture Principles
- **Performance, estabilidade e ausência de rate limits**
- **NÃO fazer chamadas à API do Scryfall em tempo real**
- **Usar Scryfall Bulk Data com banco de dados local**
- **Imagens carregadas pelo client-side via CDN**

## Arquitetura do Sistema

### Backend (FastAPI)
- **Servidor:** Roda em http://localhost:8000
- **Banco de Dados:** SQLite com 109.762 cartas MTG
- **Endpoints:**
  - `POST /parse-deck` - Processa decklists e retorna cartas
  - `GET /search/{card_name}` - Busca cartas por nome
  - `GET /printings/{card_name}` - Retorna todas as impressões de uma carta
  - `GET /health` - Health check da API
  - `GET /stats` - Estatísticas do banco

### Frontend (Vanilla JS + Tailwind)
- **Servidor:** Roda em http://localhost:3000
- **Arquitetura:** Single-page application sem frameworks
- **Estrutura Modular:** Funções organizadas por responsabilidade
- **Estado Global:** Variáveis compartilhadas para coordenação

### Comunicação Frontend-Backend
- **Protocolo:** HTTP/HTTPS com fetch API
- **Formato:** JSON para troca de dados
- **CORS:** Configurado para desenvolvimento local
- **Error Handling:** Tratamento de erros amigável com feedback visual

## Fluxo de Geração de PDF

### Arquitetura de Duas Passadas (Simplificada)
O sistema usa uma arquitetura de **passada única otimizada** após limpeza cirúrgica:

#### Passada Única: Loop Integrado
1. **Navegação de Páginas:** `doc.addPage()` quando necessário
2. **Garantia de Página Ativa:** `doc.setPage(pageIndex + 1)` ou `doc.setPage(1)`
3. **Desenho de Borda Preta:** `doc.setFillColor(0, 0, 0)` + `doc.rect()` (se ativado)
4. **Download de Imagem:** Fetch + Blob + DataURL para conversão segura
5. **Processamento de Sangria:** `processImageWithBleed()` (se ativado)
6. **Desenho da Carta:** `doc.addImage()` com coordenadas precisas
7. **Cruzes de Corte:** `doc.setDrawColor(r, g, b)` + `drawCross()` (se ativado)

### Gestão de Cores e Estado
- **Cor do Usuário:** Capturada com `hex2rgb(settings.guideColor)`
- **Anti-State Leakage:** Reset explícito de cores antes das cruzes
- **Três Cenários de Desenho:**
  - **Borda Preta:** Fundo preto + carta normal
  - **Sangria:** Carta esticada para preencher gap
  - **Normal:** Carta no tamanho original

### Cálculos de Layout
- **Dimensões MTG:** 63x88mm (base) com escala variável
- **Otimização de Orientação:** Testa retrato vs paisagem
- **Centralização Perfeita:** `(pageWidth - totalCardsWidth) / 2`
- **Gap Dinâmico:** Espaçamento configurável entre cartas

## Estrutura de UI/HTML

### Layout Principal
- **Header:** Branding MTG com status da API
- **Main Content:** Container responsivo com seções organizadas
- **Input Section:** Textarea para decklist com validação
- **Results Section:** Grid de cartas com preview visual

### Accordion de Configurações (3 Categorias)

#### Categoria 1: Layout & Geometria (Azul)
- **Responsabilidades:** Tamanho da folha, escala das cartas, espaçamento
- **Elementos:**
  - `page-size`: Seleção de formato (A4, Letter, etc)
  - `gap-spacing`: Slider para espaçamento entre cartas
  - `scale`: Select para escala (small, normal, large, giant)

#### Categoria 2: Guias de Impressão (Laranja/Amarela)
- **Responsabilidades:** Marcas de corte, bordas pretas, sangria, cor das guias
- **Elementos:**
  - `crop-marks`: Toggle para cruzes de corte
  - `guide-color`: Color picker para cor das marcas
  - `black-corners`: Toggle para bordas pretas
  - `bleed`: Toggle para sangria (extensão da arte)

#### Categoria 3: Funcionalidades Inteligentes (Roxa/Rosa)
- **Responsabilidades:** Filtros inteligentes, auto-detecção, preenchimento
- **Elementos:**
  - `skip-basic-lands`: Ignorar terrenos básicos
  - `autodetect-tokens`: Auto-detectar tokens
  - `print-double-faced`: Imprimir dupla face
  - `smart-fill`: Preenchimento inteligente

### Modal de Escolha de Artes
- **Estrutura:** Modal overlay com backdrop
- **Componentes:**
  - `art-modal`: Container principal
  - `modal-card-name`: Nome da carta no header
  - `close-modal-btn`: Botão de fechar
  - `modal-loading`: Loading de artes
  - `modal-art-grid`: Grid de opções de arte
  - `modal-error`: Mensagem de erro
- **Integração:** Conectado com endpoint `/printings`

### Modal de Progresso
- **Finalidade:** Feedback visual durante geração de PDF
- **Elementos:** Barra de progresso, contadores, botão cancelar

## Gestão de Estado

### Variáveis Globais (app.js)
```javascript
let currentCards = [];              // Cartas processadas pela API
let isGenerationCancelled = false;  // Flag para cancelar PDF
let isProcessing = false;           // Flag para evitar processamento duplo
let currentModalCardIndex = null;   // Índice da carta no modal de artes
```

### Cache de Elementos DOM
- **Performance:** Cache de referências para elementos frequentemente acessados
- **Organização:** Agrupado por funcionalidade (principal, modal, configurações)
- **Compatibilidade:** Elementos legados mantidos para backward compatibility

### Estado da Interface
- **Loading States:** Feedback visual para operações assíncronas
- **Error Handling:** Exibição amigável de erros
- **Progress Tracking:** Atualização em tempo real do progresso

## Dívida Técnica e Código Morto

### Elementos Legados (Mantidos para Compatibilidade)
- **TODO (Dead Code):** `printDecklist` - Removido do HTML mas mantido no JS
- **TODO (Dead Code):** `playtestWatermark` - Removido do HTML mas mantido no JS
- **Motivo:** Evitar quebras de funcionalidade durante migração

### Implementações Removidas
- **Passada 1.5 (Background Lines):** Sistema duplicado de marcas de corte removido
- **Coleta de Coordenadas (pageLines):** Estrutura complexa simplificada
- **State Leakage Issues:** Corrigidos com reset explícito de cores

### Possíveis Otimizações Futuras
- **Lazy Loading:** Carregar imagens apenas quando necessário
- **Web Workers:** Processamento de PDF em thread separado
- **Cache Local:** Armazenar imagens processadas localmente

## Execution Phases

### PHASE 1: Setup e Sincronização de Dados ✅ COMPLETA
- [x] Criar estrutura de pastas (backend/, frontend/)
- [x] Criar script Python autônomo (sync_db.py)
- [x] Baixar arquivo JSON "Default Cards" do Scryfall Bulk Data API
- [x] Criar banco de dados SQLite (cards.db)
- [x] Filtrar JSON e salvar dados cruciais: id, name, set, collector_number, image_uri_normal, image_uri_png, lang
- [x] Criar índices na coluna name para buscas rápidas

### PHASE 2: Backend API (FastAPI) ✅ COMPLETA
- [x] Criar main.py usando FastAPI
- [x] Criar endpoint POST /parse-deck
- [x] Implementar Regex para parse de decklist
- [x] Implementar busca no SQLite
- [x] Configurar CORS

### PHASE 3: Frontend (Interface e Preview) ✅ COMPLETA
- [x] Criar index.html, app.js com Tailwind via CDN
- [x] Criar interface com textarea, botão, grid
- [x] Implementar fetch para /parse-deck
- [x] Renderizar imagens com image_uri_normal

### PHASE 4: Geração do PDF (Client-Side) ✅ COMPLETA
- [x] Adicionar jsPDF via CDN
- [x] Implementar download assíncrono de imagens PNG
- [x] Gerar PDF com layout 3x3 por página A4
- [x] Disparar download do deck.pdf

### PHASE 5: Polimento e Funcionalidades Avançadas ✅ COMPLETA
- [x] **Phase 5.1: Parser Inteligente (Backend)** - Atualizar o Regex do `main.py` para ignorar ou utilizar tags de edição e número de colecionador (ex: `1x Demonic Tutor (UMA) 93`).
- [x] **Phase 5.2: Correção Visual do Grid (Frontend)** - Ajustar o CSS/Tailwind das cartas renderizadas para a proporção real do MTG (`aspect-[2.5/3.5]`) para evitar cortes nas imagens.
- [x] **Phase 5.3: Modal de Escolha de Artes (Frontend)** - Implementar a troca de artes de forma modular e segura, aproveitando o endpoint `/printings` já existente.

### PHASE 6: Motor PDF Avançado & UI Premium ✅ COMPLETA
- [x] **Painel de Impressão:** Interface categorizada com Tailwind (Layout & Geometria, Guias de Impressão, Funcionalidades Inteligentes).
- [x] **Modal de Carregamento:** Overlay dinâmico exibindo o progresso real do download de imagens e geração do PDF.
- [x] **Algoritmo Auto-Fit:** Cálculo matemático que detecta a orientação ideal (Retrato/Paisagem) e o grid máximo baseado no tamanho da folha e na escala da carta, evitando cortes e desperdícios de papel.
- [x] **Layout Dinâmico:** Suporte a 7 formatos de folha (A4, Letter, A3, etc), Espaçamento (Gap) seguro com recálculo perfeito de centralização, e Categorias de Escala (Pequena, Normal, Grande, Gigante).
- [x] **Guias de Corte (Guilhotina):** Implementação de bordas coloridas e marcações de corte contínuas que cruzam a página, com seletor de cores integrado na UI para contraste perfeito.

## Current Status
**PHASE 6 CONCLUÍDA** ✅ - Projeto Deck Fill 100% completo com Motor PDF Avançado!

### PHASE 1 - Resultados:
- **Download:** 511.6 MB do Default Cards do Scryfall
- **Performance:** 4.675 cartas/segundo de processamento  
- **Banco de dados:** 109.762 cartas inseridas
- **Tempo total:** 57.1 segundos
- **Arquivo final:** `cards.db` (40.2 MB)

### PHASE 2 - API Implementada:
- **FastAPI Server** - Rodando em http://localhost:8000
- **Endpoints:**
  - `POST /parse-deck` - Processa decklists
  - `GET /search/{card_name}` - Busca cartas
  - `GET /health` - Health check
  - `GET /stats` - Estatísticas do banco
  - `GET /docs` - Documentação interativa

### PHASE 3 - Frontend Implementado:
- **Interface Moderna** - Tailwind CSS com tema MTG
- **Servidor Dev** - Python serve.py (porta 3000)
- **Features:**
  - ✅ Textarea com auto-resize para decklists
  - ✅ Regex parser suporta múltiplos formatos
  - ✅ Grid responsivo com animações suaves
  - ✅ Renderização de imagens via Scryfall CDN
  - ✅ Health check automático da API
  - ✅ Loading states e feedback visual
  - ✅ Tratamento de erros amigável
  - ✅ Atalhos (Ctrl+Enter) e botões de utilidade

### PHASE 4 - PDF Generation Implementado:
- **jsPDF Integration** - Biblioteca via CDN (v2.5.1)
- **Layout 3x3 Preciso** - 9 cartas por página A4 com cálculo exato de margens
- **Dimensões MTG Oficiais** - 63x88mm por carta (proporção correta para impressão)
- **Download Assíncrono Seguro** - Fetch + Blob + DataURL para evitar CORS
- **Conversão Base64** - FileReader API para converter imagens Scryfall
- **Paginação Automática** - Nova página a cada 9 cartas (índice % 9 === 0)
- **Feedback Visual** - Botão com loading spinner e disabled state
- **Tratamento CORS** - Evita problemas de canvas com cross-origin images
- **Cálculo de Margens** - Centralização perfeita: (210-189)/2 = 10.5mm X, (297-264)/2 = 16.5mm Y
- **Prioridade de Imagem** - Usa PNG (alta qualidade) com fallback para Normal

## Arquivos Criados
### Backend
- `sync_db.py` - Script principal (baixa, processa, insere no SQLite)
- `test_sync.py` - Testes de validação (API, BD, JSON)
- `validate_db.py` - Script de validação do banco de dados
- `main.py` - Servidor FastAPI completo
- `test_api.py` - Suite de testes para API
- `requirements.txt` - requests, fastapi, uvicorn, python-multipart
- `README.md` - Documentação de uso
- `cards.db` - Banco de dados SQLite com 109.762 cartas
- `.gitkeep` - Mantém estrutura de pastas

### Frontend
- `index.html` - Interface completa com design moderno
- `app.js` - Lógica JavaScript com integração API
- `serve.py` - Servidor de desenvolvimento com CORS
- `README.md` - Documentação completa do frontend
- `.gitkeep` - Mantém estrutura de pastas

### Projeto
- `PROJECT_MEMORY.md` - Contexto e progresso

## 🎉 PROJETO COMPLETO!

**Deck Fill está 100% funcional** - Do decklist ao PDF pronto para impressão!

### Como Usar:
1. **Backend:** `cd backend && python main.py` (porta 8000)
2. **Frontend:** `cd frontend && python serve.py` (porta 3000)
3. **Acessar:** http://localhost:3000
4. **Processar:** Cole decklist → Processar Deck → Gerar PDF

### Funcionalidades Completas:
- ✅ **Banco de dados** com 109.762 cartas MTG
- ✅ **API ultra-rápida** para processar decklists
- ✅ **Interface moderna** e responsiva
- ✅ **Renderização de cartas** com imagens Scryfall
- ✅ **Geração de PDF** com layout 3x3 para impressão

### Arquitetura de Produção:
- **Backend:** FastAPI + SQLite (sem rate limits)
- **Frontend:** Vanilla JS + Tailwind CSS
- **PDF:** Client-side com jsPDF (evita sobrecarregar backend)
- **Performance:** Milhares de cartas/segundo de processamento

## Important Notes
- Foco absoluto em performance e estabilidade
- Sem suposições - pesquisar documentação quando necessário
- Logs claros no backend para acompanhamento
- Trabalhar fase por fase com aprovação do usuário

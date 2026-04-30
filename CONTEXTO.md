# CONTEXTO.md - Documentação Arquitetural do DeckFill

> **Arquiteto de Sistemas**: Análise completa para reorganização em escala profissional  
> **Data**: 29/04/2026  
> **Status**: Documentação técnica completa para modularização

---

## 📁 Estrutura de Pastas Atual

```
DeckFill/
├── .git/
├── .windsurf/
│   └── memories/
│       └── progress.md
├── backend/
│   ├── main.py              # API FastAPI principal
│   ├── sync_db.py           # Sincronização com Scryfall
│   ├── test_api.py          # Testes da API
│   ├── test_dfc.py          # Testes DFC (Double-Faced Cards)
│   ├── test_parser_v5.py    # Testes parser v5.1
│   ├── test_printings_api.py # Testes API de impressões
│   ├── test_sync.py         # Testes sincronização
│   ├── validate_db.py       # Validação do banco
│   ├── requirements.txt     # Dependências Python
│   ├── README.md           # Documentação backend
│   └── .gitkeep
├── frontend/
│   ├── index.html          # Interface principal
│   ├── app.js              # JavaScript monolítico (1905 linhas)
│   ├── README.md           # Documentação frontend
│   └── .gitkeep
├── TUTORIAL_PHASE_5_1.md   # Tutorial obsoleto (Phase 5.1)
├── PROJECT_MEMORY.md      # Memória do projeto
├── debug_db.py             # Debug do banco de dados
└── .gitignore
```

---

## 🎯 Mapeamento de Responsabilidades

### Frontend

| Arquivo | Responsabilidade Principal | Status |
|---------|---------------------------|---------|
| `index.html` | Interface HTML completa com modais, formulários e estrutura visual | ✅ Ativo |
| `app.js` | **MONOLITO**: Processamento de decklists, renderização de cartas, geração de PDF, upload de imagens, gerenciamento de estado | ⚠️ Precisa modularização |

### Backend

| Arquivo | Responsabilidade Principal | Status |
|---------|---------------------------|---------|
| `main.py` | API FastAPI: parse de decklists, busca de cartas, health checks | ✅ Ativo |
| `sync_db.py` | Sincronização inicial com Scryfall Bulk Data | ✅ Ativo |
| `test_*.py` | Testes automatizados da API | ✅ Ativo |
| `validate_db.py` | Validação de integridade do banco | ✅ Ativo |

### Arquivos de Configuração

| Arquivo | Responsabilidade | Status |
|---------|------------------|---------|
| `requirements.txt` | Dependências Python | ✅ Ativo |
| `TUTORIAL_PHASE_5_1.md` | Tutorial parser v5.1 | ❌ **OBSOLETO** - Parser já implementado |
| `debug_db.py` | Debug pontual | ⚠️ Temporário |

---

## 🔧 Dicionário de Funções (app.js - O Coração do Sistema)

### Configuração e Estado Global

| Função | O que Faz | Parâmetros | Quem Chama |
|--------|-----------|------------|------------|
| `initializeEventListeners()` | Configura todos os event listeners da aplicação | Nenhum | `DOMContentLoaded` |
| `checkApiHealth()` | Verifica se API está online | Nenhum | `DOMContentLoaded` |

### Processamento Principal

| Função | O que Faz | Parâmetros | Quem Chama |
|--------|-----------|------------|------------|
| `processDecklist()` | Processa decklist via API | Nenhum (lê do textarea) | Botão "Processar Deck" |
| `renderResults()` | Renderiza grid de cartas | `data` (resposta API) | `processDecklist()` |
| `createCardElement()` | Cria elemento HTML de carta | `card`, `index` | `renderResults()` |

### Interface e Usuário

| Função | O que Faz | Parâmetros | Quem Chama |
|--------|-----------|------------|------------|
| `showLoading()` | Mostra tela de loading | Nenhum | `processDecklist()` |
| `hideLoading()` | Esconde tela de loading | Nenhum | `processDecklist()` |
| `clearDecklist()` | Limpa interface | Nenhum | Botão "Limpar" |
| `loadSampleDecklist()` | Carrega decklist exemplo | Nenhum | Botão "Carregar Exemplo" |
| `showError()` | Mostra toast de erro | `message` (string) | Vários pontos |
| `showErrors()` | Mostra seção de erros | `errors` (array) | `renderResults()` |
| `hideErrors()` | Esconde seção de erros | Nenhum | Event listeners |

### Modal de Artes

| Função | O que Faz | Parâmetros | Quem Chama |
|--------|-----------|------------|------------|
| `openArtModal()` | Abre modal com opções de arte | `card`, `index` | Clique na carta |
| `closeArtModal()` | Fecha modal de artes | Nenhum | Botão fechar, ESC |
| `loadCardPrintings()` | Carrega todas as impressões de carta | `cardName` | `openArtModal()` |

### Upload de Imagens

| Função | O que Faz | Parâmetros | Quem Chama |
|--------|-----------|------------|------------|
| `handleCustomImageUpload()` | Processa upload de imagem personalizada | Evento `change` | Input file |
| `clearCustomImage()` | Remove imagem personalizada | Nenhum | Botão "Remover" |
| `handleCustomImageUploadBack()` | Processa upload de verso (DFC) | Evento `change` | Input file verso |
| `clearCustomImageBack()` | Remove imagem verso | Nenhum | Botão "Remover verso" |

### Configurações de Impressão

| Função | O que Faz | Parâmetros | Quem Chama |
|--------|-----------|------------|------------|
| `togglePrintSettings()` | Abre/fecha accordion de configurações | Nenhum | Botão toggle |
| `updateGapValue()` | Atualiza display do gap | Nenhum | Input range |
| `getPrintSettings()` | Coleta todas as configurações | Nenhum | `generatePDF()` |

### Geração de PDF

| Função | O que Faz | Parâmetros | Quem Chama |
|--------|-----------|------------|------------|
| `generatePDF()` | **FUNÇÃO PRINCIPAL**: Gera PDF completo | Nenhum | Botão "Gerar PDF" |
| `processImageWithBleed()` | Processa imagem com sangria | `blob`, `bleedSizeInMm` | `generatePDF()` |
| `showProgressModal()` | Mostra modal de progresso | Nenhum | `generatePDF()` |
| `hideProgressModal()` | Esconde modal de progresso | Nenhum | Botões cancelar/fechar |

### Utilitários

| Função | O que Faz | Parâmetros | Quem Chama |
|--------|-----------|------------|------------|
| `toggleCardFace()` | Vira carta DFC | `btn`, `frontUrl`, `backUrl` | Botão ↻ |
| `initializeCardClickDelegation()` | Configura delegação de cliques | Nenhum | `initializeEventListeners()` |

---

## 🌊 Estado Global

### Variáveis Principais

| Variável | Tipo | Descrição | Fluxo no Sistema |
|----------|------|-----------|------------------|
| `currentCards` | Array | Cartas processadas pela API | API → `processDecklist()` → `currentCards` → `generatePDF()` |
| `isProcessing` | Boolean | Flag para evitar race conditions | `processDecklist()` → controle UI |
| `isGenerationCancelled` | Boolean | Cancelamento de geração PDF | Botão cancelar → `generatePDF()` |
| `currentModalCardIndex` | Number | Índice da carta no modal | Modal → seleção de artes |
| `customImages` | Map | Imagens personalizadas por carta | Upload → `generatePDF()` |
| `globalCustomBackImage` | String | DataURL do verso global | Upload verso → `generatePDF()` |

### Constantes

| Variável | Valor | Uso |
|----------|-------|-----|
| `MTG_BACK_URL` | URL verso padrão Magic | Fallback para DFCs |
| `API_BASE` | "http://localhost:8000" | Comunicação com backend |
| `SAMPLE_DECKLIST` | Decklist exemplo | Demonstração |

---

## 🔄 Fluxo de Dados: Do Decklist ao PDF

```mermaid
graph TD
    A[Usuário cola decklist] --> B[processDecklist()]
    B --> C[Validação]
    C --> D[POST /parse-deck]
    D --> E[Backend: parse_decklist()]
    E --> F[Backend: search_cards()]
    F --> G[Retorno: cards + errors]
    G --> H[currentCards = cards]
    H --> I[renderResults()]
    I --> J[Grid de cartas]
    J --> K[Clique em carta]
    K --> L[openArtModal()]
    L --> M[GET /printings/{card}]
    M --> N[Seleção de arte]
    N --> O[customImages Map]
    O --> P[Botão Gerar PDF]
    P --> Q[generatePDF()]
    Q --> R[getPrintSettings()]
    R --> S[Processamento de imagens]
    S --> T[jsPDF rendering]
    T --> U[Download do PDF]
```

### Detalhamento do Fluxo

1. **Input do Usuário**: Decklist no textarea
2. **Processamento**: `processDecklist()` valida e envia para API
3. **Backend**: `parse_decklist()` extrai quantidades/nomes, `search_cards()` busca no SQLite
4. **Frontend**: `renderResults()` cria grid visual
5. **Interação**: Usuário pode clicar em cartas para escolher artes
6. **Personalização**: Upload de imagens via modais
7. **Configuração**: Ajustes de impressão via accordion
8. **Geração**: `generatePDF()` processa tudo e cria PDF final

---

## 🏗️ Plano de Modularização (Sugestão)

### 📁 Estrutura Proposta para `/js`

```
frontend/
├── index.html
├── js/
│   ├── core/
│   │   ├── app.js              # Ponto de entrada, inicialização
│   │   ├── state-manager.js    # Gerenciamento de estado global
│   │   └── config.js           # Configurações e constantes
│   ├── api/
│   │   ├── api-client.js       # Comunicação com backend
│   │   └── endpoints.js        # Definição de endpoints
│   ├── ui/
│   │   ├── ui-handlers.js      # Event listeners da UI
│   │   ├── modal-manager.js    # Controle de modais
│   │   └── notifications.js    # Toasts e notificações
│   ├── deck/
│   │   ├── deck-processor.js   # Processamento de decklists
│   │   ├── card-renderer.js    # Renderização de cartas
│   │   └── art-selector.js     # Seleção de artes
│   ├── pdf/
│   │   ├── pdf-engine.js       # Motor de geração PDF
│   │   ├── image-processor.js  # Processamento de imagens
│   │   └── layout-calculator.js # Cálculos de layout
│   ├── upload/
│   │   ├── image-upload.js     # Upload de imagens personalizadas
│   │   └── preview-manager.js  # Previews de uploads
│   └── utils/
│       ├── helpers.js          # Funções utilitárias
│       └── validators.js       # Validações
└── styles/
    └── components.css          # Estilos modularizados
```

### 🎯 Módulos Principais e Responsabilidades

#### `core/`
- **app.js**: Inicialização, ponto de entrada
- **state-manager.js**: Gerenciar `currentCards`, `customImages`, flags
- **config.js**: `API_BASE`, constantes, configurações

#### `api/`
- **api-client.js**: Wrapper para `fetch()`, tratamento de erros
- **endpoints.js**: URLs e configurações da API

#### `ui/`
- **ui-handlers.js**: Todos os event listeners
- **modal-manager.js**: Controle de abertura/fechamento
- **notifications.js**: Sistema de toast/erros

#### `deck/`
- **deck-processor.js**: Lógica de `processDecklist()`
- **card-renderer.js**: `createCardElement()`, grid rendering
- **art-selector.js**: Modal de artes, `openArtModal()`

#### `pdf/`
- **pdf-engine.js**: `generatePDF()`, jsPDF integration
- **image-processor.js**: `processImageWithBleed()`
- **layout-calculator.js**: Cálculos de layout/margens

#### `upload/`
- **image-upload.js**: File handlers, preview
- **preview-manager.js**: Gestão de previews

### 🔄 Benefícios da Modularização

1. **Manutenibilidade**: Cada módulo com responsabilidade clara
2. **Testabilidade**: Módulos podem ser testados isoladamente
3. **Reutilização**: Componentes reutilizáveis
4. **Performance**: Carregamento sob demanda
5. **Escalabilidade**: Fácil adicionar novas features

---

## ⚠️ Arquivos Obsoletos Identificados

### `TUTORIAL_PHASE_5_1.md`
- **Status**: **OBSOLETO**
- **Motivo**: Parser v5.1 já está implementado e funcional em `main.py`
- **Conteúdo**: Tutorial para testar parser com suporte a `(SET)` e `#number`
- **Recomendação**: **Pode ser removido** - funcionalidade já em produção

### `debug_db.py`
- **Status**: **TEMPORÁRIO**
- **Motivo**: Script pontual para debug de banco
- **Recomendação**: Manter em pasta `debug/` ou remover após uso

---

## 🚀 Próximos Passos para Reorganização

### Fase 1: Modularização do Frontend
1. Criar estrutura `/js/` proposta
2. Migrar funções do `app.js` monolítico
3. Atualizar `index.html` para carregar módulos
4. Testar integração

### Fase 2: Organização do Backend
1. Criar pasta `/tests/` para testes
2. Mover scripts de debug para pasta `/debug/`
3. Documentar API com OpenAPI/Swagger

### Fase 3: Limpeza
1. Remover arquivos obsoletos
2. Atualizar documentação
3. Configurar build pipeline

---

## 📊 Métricas Atuais

- **app.js**: 1905 linhas (monolítico)
- **main.py**: 506 linhas (bem estruturado)
- **Arquivos de teste**: 6 scripts ativos
- **Dependências**: Frontend (CDN), Backend (7 pacotes Python)

---

## 🎯 Conclusão

O projeto possui uma arquitetura sólida no backend (FastAPI bem estruturado) mas sofre de **monolitismo no frontend**. O `app.js` com 1905 linhas concentra múltiplas responsabilidades que precisam ser separadas para escala profissional.

A modularização proposta manterá toda a funcionalidade atual enquanto permitirá:
- Manutenibilidade melhorada
- Testes automatizados por módulo
- Desenvolvimento paralelo por features
- Performance otimizada

**Status**: Pronto para começar reorganização seguindo plano acima.

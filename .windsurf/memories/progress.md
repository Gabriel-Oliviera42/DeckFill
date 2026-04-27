# 📋 Deck Fill - Progress & Roadmap

## 🎯 **Status Atual (v1.0 - COMPLETO)**

### ✅ **Funcionalidades Implementadas:**
- **Backend Thread-Safe:** SQLite com `contextlib.closing()` 
- **Parser Inteligente:** Suporte a múltiplos formatos de decklist
- **Modal de Artes:** Seleção de impressões com lazy loading
- **PDF Generation:** Exportação de deck completo
- **Event Delegation:** Cliques permanentes após atualização DOM

### 🏗️ **Estrutura do Banco de Dados:**
```sql
-- Tabela principal de cartas (cards.db)
CREATE TABLE cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    set_code TEXT NOT NULL,
    collector_number TEXT NOT NULL,
    image_uri_normal TEXT,
    image_uri_png TEXT,
    lang TEXT DEFAULT 'en'
);

-- Índices otimizados para busca
CREATE INDEX idx_cards_name ON cards(name COLLATE NOCASE);
CREATE INDEX idx_cards_set_number ON cards(set_code, collector_number);
```

### 🔄 **Fluxo de Dados Atual:**
```
Decklist Input → parse_decklist() → search_cards() → currentCards[] → DOM Grid
                                   ↓
                              /printings endpoint
                                   ↓
                            Modal Selection → updateCardElement()
                                   ↓
                            PDF Generation → currentCards[]
```

### 📁 **Arquivos Chave:**
- `backend/main.py` - API FastAPI thread-safe
- `backend/cards.db` - Banco SQLite (≈70k cartas)
- `frontend/app.js` - Lógica frontend com delegação de eventos
- `frontend/index.html` - UI com modal de artes

---

## 🚀 **Roadmap Futuro: Imagens Customizadas**

### 🎨 **Fase 1: Estrutura do Banco**
```sql
-- Nova tabela para artes customizadas
CREATE TABLE user_custom_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_name TEXT NOT NULL,
    original_image_path TEXT NOT NULL,
    resized_image_path TEXT NOT NULL,
    upload_timestamp INTEGER NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    UNIQUE(card_name)  -- Uma arte customizada por carta
);
```

### 📂 **Estrutura de Pastas:**
```
backend/
├── uploads/
│   ├── original/          # Uploads originais
│   └── resized/           # Versões redimensionadas (223x311px)
└── main.py
```

### 🔧 **Fase 2: Backend - Upload Processing**
```python
# Novo endpoint POST /upload-art
@app.post("/upload-art")
async def upload_custom_art(file: UploadFile, card_name: str):
    # 1. Validar tipo (PNG/JPG apenas)
    # 2. Gerar nome único com UUID
    # 3. Redimensionar com Pillow (223x311px)
    # 4. Salvar em uploads/resized/
    # 5. Salvar caminho no banco
    # 6. Retornar sucesso
```

### 🎨 **Fase 3: Frontend - UI Integration**
```javascript
// Botão "Upload Custom Art" no modal
function addCustomArtButton(cardName) {
    // Input file oculto
    // Preview da imagem
    // Upload para /upload-art
    // Atualizar modal com nova opção
}
```

### 📄 **Fase 4: PDF Priority Update**
```python
# Prioridade na geração de PDF:
def get_card_image(card):
    if card.custom_image_path:
        return card.custom_image_path  # 1. Arte customizada
    elif card.image_uri_png:
        return card.image_uri_png      # 2. PNG Scryfall
    else:
        return card.image_uri_normal  # 3. Normal Scryfall
```

---

## ⚠️ **Considerações Técnicas**

### 🔒 **Segurança:**
- **Validação MIME:** `image/png`, `image/jpeg` apenas
- **Size Limit:** Max 5MB por upload
- **File Scanning:** Verificação de cabeçalho de arquivo
- **Path Traversal:** Proteção contra `../../../etc/passwd`

### ⚡ **Performance:**
- **Lazy Loading:** Imagens customizadas também com `loading="lazy"`
- **Image Optimization:** Compressão JPEG 85% qualidade
- **Cache Headers:** `Cache-Control: max-age=31536000`
- **CDN Ready:** Estrutura preparada para futura migração

### 🔄 **Backup & Migration:**
- **Database Backup:** Incluir caminhos das imagens customizadas
- **File Sync:** Backup da pasta `uploads/`
- **Migration Script:** Atualização de versões do banco

---

## 🎯 **Próximos Passos**

### 📋 **Sprint 1 (Infraestrutura):**
1. Criar tabela `user_custom_cards`
2. Configurar pasta `uploads/`
3. Implementar validação de arquivos
4. Setup Pillow para redimensionamento

### 📋 **Sprint 2 (Backend):**
1. Endpoint `/upload-art`
2. Processamento de imagens
3. Integração com banco existente
4. Testes automatizados

### 📋 **Sprint 3 (Frontend):**
1. UI de upload no modal
2. Preview em tempo real
3. Feedback de upload
4. Integração com seleção de artes

### 📋 **Sprint 4 (Integração):**
1. Atualização de geração de PDF
2. Priorização de imagens customizadas
3. Testes E2E completos
4. Documentação final

---

## 📊 **Métricas de Sucesso:**
- **Upload Time:** < 3 segundos para imagem 2MB
- **Processing Time:** < 1 segundo para redimensionamento
- **Storage:** ~50KB por imagem redimensionada
- **User Experience:** Upload drag-and-drop funcional
- **PDF Quality:** Sem perda de resolução em artes customizadas

---

*Última atualização: 26/04/2026 - Projeto 100% funcional, pronto para expansão*

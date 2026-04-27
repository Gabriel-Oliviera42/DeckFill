# Deck Fill - Backend

## Estrutura
- `sync_db.py` - Script principal para sincronização do banco de dados
- `test_sync.py` - Suite de testes para validar funcionamento
- `requirements.txt` - Dependências Python
- `cards.db` - Banco de dados SQLite (criado pelo sync_db.py)

## Como Usar

### 1. Instalar Dependências
```bash
pip install -r requirements.txt
```

### 2. Testar Funcionalidade
```bash
python test_sync.py
```

### 3. Sincronizar Banco de Dados
```bash
python sync_db.py
```

**Atenção:** O download do arquivo Default Cards é grande (~500MB compactado) e pode levar alguns minutos dependendo da sua conexão.

## O que o sync_db.py faz?

1. **Busca informações do Bulk Data** - Consulta a API do Scryfall para encontrar o arquivo Default Cards mais recente
2. **Baixa o arquivo JSON** - Faz download do arquivo compactado com todas as cartas
3. **Cria o banco SQLite** - Configura a tabela `cards` com índices para buscas rápidas
4. **Processa e insere dados** - Extrai apenas os campos necessários de cada carta:
   - `id` - ID único da carta
   - `name` - Nome da carta
   - `set_code` - Código do set (ex: LEA, RTR)
   - `collector_number` - Número do colecionador
   - `image_uri_normal` - URL da imagem em tamanho normal
   - `image_uri_png` - URL da imagem em alta qualidade
   - `lang` - Idioma (prioriza inglês)

## Formatos de Decklist Suportados

### Formatos Clássicos (continuam funcionando)
```
4x Lightning Bolt
2 Island  
1 Thantis, the Warweaver
3 Black Lotus
4 Force of Will

// Comentários (ignorados)
// Esta linha será ignorada
# Esta também

// Formatos alternativos
Lightning Bolt          (assume quantidade 1)
4 Lightning Bolt       (sem o "x")
```

### Novos Formatos Phase 5.1 - Parser Inteligente
```
# Com set e collector number (mais preciso)
1x Demonic Tutor (UMA) 93
2 Force of Will (EMA) 27
4 Brainstorm (EMA) 43

# Com set apenas (prioriza esse set)
1x Sol Ring (2ED)
2 Ancestral Recall (LEB)

# Sem "x" também funciona
1 Lightning Bolt (LEA) 282
3 Island (VMA) 73

# Formatos misturados no mesmo decklist
4x Chain Lightning (EMA) 91
1 Volcanic Island (VMA) 280
2 Island
4x Lightning Bolt
```

### Vantagens do Parser Inteligente:
- ✅ **Busca Específica**: `(SET) #number` encontra a exata edição
- ✅ **Priorização por Set**: `(SET)` sem número prioriza esse set
- ✅ **Compatibilidade Total**: Format antigos continuam funcionando
- ✅ **Flexibilidade**: Misture formatos no mesmo decklist
- ✅ **Precisão**: Evita confusão entre reprints com nomes iguais

## Performance

- **Índices:** Criados índices nas colunas `name` e `set_code` para buscas ultra-rápidas
- **Processamento:** O script processa o arquivo linha por linha para economizar memória
- **Logs:** Progresso detalhado com taxa de processamento em cartas/segundo

## Banco de Dados

O `cards.db` contém:
- Tabela `cards` com todos os dados das cartas
- Índice `idx_cards_name` para busca por nome
- Índice `idx_cards_set` para busca por set

Exemplo de query:
```sql
SELECT name, set_code, image_uri_normal 
FROM cards 
WHERE name LIKE '%Lightning Bolt%' 
ORDER BY set_code;
```

## Troubleshooting

### Erro de Conexão
- Verifique sua conexão com a internet
- Confirme que a API do Scryfall está acessível: https://api.scryfall.com/bulk-data

### Erro de Memória
- O script foi otimizado para usar pouca memória
- Se tiver problemas, feche outros programas enquanto executa

### Banco de Dados Corrompido
- Delete o arquivo `cards.db` e execute o script novamente
- O script sempre recria o banco do zero

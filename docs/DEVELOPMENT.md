# Desenvolvimento

## Pré-Requisitos

- Python 3.
- Navegador moderno.
- Conexão com internet para sincronizar Scryfall e consultar APIs externas.

## Instalação

```bash
cd backend
pip install -r requirements.txt
```

## Criar Banco Magic

```bash
cd backend
python sync_db.py
```

Esse comando baixa o Scryfall Bulk Data e recria `backend/cards.db`.

## Rodar Backend

```bash
cd backend
python main.py
```

URLs úteis:

- `http://localhost:8000`
- `http://localhost:8000/health`
- `http://localhost:8000/docs`

## Rodar Frontend

```bash
cd frontend
python serve.py
```

Acesse:

- `http://localhost:3000`

## Testes Existentes

Os testes atuais são scripts Python manuais.

Com o backend rodando:

```bash
cd backend
python test_api.py
python test_parser_v5.py
python test_printings_api.py
python test_dfc.py
```

Testes de sincronização:

```bash
cd backend
python test_sync.py
python validate_db.py
```

## Debug no Navegador

O frontend expõe algumas funções em `window.deckFillApp`, incluindo:

- `processDecklist()`
- `clearDecklist()`
- `loadSampleDecklist()`
- `currentCards`
- `checkApiHealth()`
- `generatePDF()`
- `getPrintSettings()`

## Cuidados ao Alterar

- Preservar o formato `CardResponse`, porque os providers diferentes dependem dele.
- Evitar quebrar DFCs de Magic ao mexer em imagens.
- Validar geração de PDF com cartas normais, DFCs e imagens customizadas.
- Testar modo manual e modo profissional separadamente.
- Antes de produção, fechar CORS e revisar hosts permitidos em `/image-proxy`.
- Não versionar bancos SQLite, imagens de teste grandes, uploads ou caches.

## Próximas Melhorias Técnicas Recomendadas

- Transformar os scripts `test_*.py` em suíte automatizada com `pytest`.
- Separar melhor o restante do `frontend/app.js`.
- Criar cache persistente para Pokémon e Yu-Gi-Oh!.
- Criar persistência backend para uploads de artes customizadas.
- Criar configuração de parceiro de impressão em vez de telefone fixo no código.
- Adicionar variáveis de ambiente para URLs, CORS e chaves de API.
- Padronizar encoding UTF-8 nos documentos antigos.


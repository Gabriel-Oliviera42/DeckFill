# DeckFill

DeckFill é uma ferramenta para transformar decklists de TCGs em PDFs prontos para impressão de proxies. O projeto começou com foco em Magic: The Gathering e hoje já tem suporte inicial para Pokémon TCG e Yu-Gi-Oh!, além de configurações de impressão manual e um primeiro modo de impressão profissional.

## Status Atual

O projeto está em fase de MVP funcional:

- Backend em FastAPI.
- Frontend em HTML, Tailwind CSS, JavaScript vanilla e jsPDF.
- Base local SQLite para cartas de Magic sincronizada a partir do Scryfall.
- Providers externos iniciais para Pokémon TCG e Yu-Gi-Oh!.
- Geração de PDF no navegador.
- Seleção de artes/reimpressões para Magic.
- Upload local de imagens personalizadas no frontend.
- Modo de impressão profissional com preset de layout e marcas de registro.
- Integração inicial de contato via WhatsApp para fluxo com parceiro de impressão.

## Como Rodar

### Backend

```bash
cd backend
pip install -r requirements.txt
python sync_db.py
python main.py
```

O backend roda em `http://localhost:8000`.

### Frontend

```bash
cd frontend
python serve.py
```

O frontend roda em `http://localhost:3000`.

## Estrutura

```text
DeckFill/
├── backend/
│   ├── main.py
│   ├── sync_db.py
│   ├── providers/
│   └── test_*.py
├── frontend/
│   ├── index.html
│   ├── app.js
│   ├── serve.py
│   └── js/
├── docs/
└── CONTEXTO.md
```

## Documentação Principal

- [Produto](docs/PRODUCT.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Estratégia de Parceiro](docs/PARTNER_STRATEGY.md)
- [Desenvolvimento](docs/DEVELOPMENT.md)
- [Roadmap](docs/ROADMAP.md)
- [Plano de Paridade com Proxxied](docs/PROXXIED_PARITY_PLAN.md)
- [Perguntas Abertas](docs/QUESTIONS.md)

## Observações Importantes

- Os arquivos `backend/README.md`, `frontend/README.md` e `CONTEXTO.md` parecem conter partes antigas do projeto. Eles ainda são úteis como histórico, mas os documentos em `docs/` devem ser tratados como a base mais atual.
- O modo Pokémon e Yu-Gi-Oh! ainda depende de APIs externas em tempo real e deve ganhar cache/controle de limites antes de produção.
- Qualquer uso comercial com proxies precisa validar riscos de marca, imagem, direitos autorais e termos das APIs utilizadas.

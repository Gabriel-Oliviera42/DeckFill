#!/usr/bin/env python3
"""
Deck Fill - Backend API
FastAPI server para processar decklists e buscar cartas no banco de dados local.
"""
import requests
from fastapi.responses import Response
from urllib.parse import urlparse

import sqlite3
import re
import time
import contextlib
from typing import List, Dict, Any, Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from providers.registry import get_card_provider, normalize_game_key

# Configurações
DB_FILE = "cards.db"
PORT = 8000

# Modelos Pydantic
class CardResponse(BaseModel):
    id: str
    oracle_id: Optional[str] = None

    name: str
    printed_name: Optional[str] = None
    lang: str = "en"
    layout: Optional[str] = None

    set_code: str
    set_name: Optional[str] = None
    collector_number: str
    released_at: Optional[str] = None
    rarity: Optional[str] = None

    type_line: Optional[str] = None
    printed_type_line: Optional[str] = None
    oracle_text: Optional[str] = None
    printed_text: Optional[str] = None

    image_uri_normal: Optional[str] = None
    image_uri_png: Optional[str] = None
    image_uri_art_crop: Optional[str] = None

    image_uri_back_normal: Optional[str] = None
    image_uri_back_png: Optional[str] = None
    image_uri_back_art_crop: Optional[str] = None

    back_name: Optional[str] = None
    back_printed_name: Optional[str] = None
    back_type_line: Optional[str] = None
    back_oracle_text: Optional[str] = None
    back_printed_text: Optional[str] = None

    all_parts_json: Optional[str] = None
    card_faces_json: Optional[str] = None

class DeckParseRequest(BaseModel):
    decklist: str
    game: str = "magic"

class DeckParseResponse(BaseModel):
    cards: List[CardResponse]
    total_cards: int
    processing_time_ms: float
    errors: List[str]

# Inicialização FastAPI
app = FastAPI(
    title="Deck Fill API",
    description="API para processar decklists de Magic: The Gathering",
    version="1.0.0"
)

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todas as origens para desenvolvimento
    allow_credentials=True,
    allow_methods=["*"],  # Permitir todos os métodos
    allow_headers=["*"],  # Permitir todos os headers
)

def get_db_connection() -> sqlite3.Connection:
    """Obtém uma conexão limpa com o banco de dados (Thread-Safe)."""
    if not Path(DB_FILE).exists():
        raise HTTPException(
            status_code=500,
            detail=f"Banco de dados '{DB_FILE}' não encontrado. Execute sync_db.py primeiro."
        )
    
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row  # Para acessar colunas por nome
    return conn

CARD_SELECT_COLUMNS = """
    id,
    oracle_id,
    name,
    printed_name,
    lang,
    layout,

    set_code,
    set_name,
    collector_number,
    released_at,
    rarity,

    type_line,
    printed_type_line,
    oracle_text,
    printed_text,

    image_uri_normal,
    image_uri_png,
    image_uri_art_crop,

    image_uri_back_normal,
    image_uri_back_png,
    image_uri_back_art_crop,

    back_name,
    back_printed_name,
    back_type_line,
    back_oracle_text,
    back_printed_text,

    all_parts_json,
    card_faces_json
"""

@app.get("/")
async def root():
    """Endpoint raiz para verificar se API está online."""
    return {
        "message": "Deck Fill API Online",
        "version": "1.0.0",
        "status": "operational"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        with contextlib.closing(get_db_connection()) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM cards")
            card_count = cursor.fetchone()[0]
            
            return {
                "status": "healthy",
                "database_connected": True,
                "total_cards": card_count,
                "timestamp": time.time()
            }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Health check failed: {str(e)}"
        )

@app.get("/image-proxy")
async def image_proxy(url: str):
    """
    Proxy simples para imagens externas usadas na geração de PDF.

    Necessário porque algumas APIs permitem exibir a imagem em <img>,
    mas bloqueiam fetch/canvas por CORS no navegador.
    """
    try:
        parsed = urlparse(url)

        allowed_hosts = {
            "images.ygoprodeck.com",
            "cards.scryfall.io",
            "i.postimg.cc",
            "upload.wikimedia.org",
        }

        if parsed.scheme not in {"http", "https"}:
            raise HTTPException(status_code=400, detail="URL inválida.")

        if parsed.netloc not in allowed_hosts:
            raise HTTPException(
                status_code=400,
                detail=f"Host de imagem não permitido: {parsed.netloc}",
            )

        response = requests.get(url, timeout=20)

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail="Não foi possível baixar a imagem.",
            )

        content_type = response.headers.get("content-type", "image/jpeg")

        return Response(
            content=response.content,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=86400",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar imagem: {str(e)}",
        )

@app.post("/parse-deck", response_model=DeckParseResponse)
async def parse_deck(request: DeckParseRequest):
    """
    Processa um decklist e retorna informações das cartas.
    
    Exemplo de decklist:
    ```
    4x Lightning Bolt
    1 Thantis, the Warweaver
    2 Island
    ```
    """
    start_time = time.time()

    game = normalize_game_key(request.game)
    provider = get_card_provider(game)
    
    # DEBUG - Raio-X: Entrada do /parse-deck
    print(f"🔍 DEBUG - Jogo recebido: {game}")
    print(f"🔍 DEBUG - Recebido do frontend: {repr(request.decklist)}")
    
    try:
        # 1. Parse do decklist
        parsed_cards, parse_errors = provider.parse_decklist(request.decklist)
        print(f"🔍 DEBUG - Parser retornou {len(parsed_cards)} cartas e {len(parse_errors)} erros")
        
        # 2. Buscar cartas no banco (agora com informações de set/number)
        unique_parsed_cards = []
        seen_names = set()
        
        for card in parsed_cards:
            if card['name'] not in seen_names:
                unique_parsed_cards.append(card)
                seen_names.add(card['name'])
        
        search_results = provider.search_cards(unique_parsed_cards)
        
        # 3. Montar resposta
        response_cards = []
        not_found = []
        
        for parsed_card in parsed_cards:
            card_name = parsed_card['name']
            quantity = parsed_card['quantity']
            
            if card_name in search_results and search_results[card_name]:
                # Pega a primeira (melhor) correspondência
                # Converte sqlite3.Row para dict nativo antes de passar para CardResponse
                card_data = dict(search_results[card_name][0])
                
                # Adiciona a quantidade para cada cópia
                for _ in range(quantity):
                    front_card = dict(card_data)
                    response_cards.append(CardResponse(**front_card))
            else:
                not_found.append(f"{quantity}x {card_name}")
        
        # 4. Calcular tempo de processamento
        processing_time = (time.time() - start_time) * 1000  # ms
        
        # 5. Montar erros
        errors = parse_errors.copy()
        if not_found:
            errors.extend([f"Carta não encontrada: {card}" for card in not_found])
        
        return DeckParseResponse(
            cards=response_cards,
            total_cards=len(response_cards),
            processing_time_ms=round(processing_time, 2),
            errors=errors
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar decklist: {str(e)}"
        )

@app.get("/search/{card_name}")
async def search_card(card_name: str, limit: int = 10):
    """
    Busca uma carta específica pelo nome.
    
    Query params:
    - limit: número máximo de resultados (padrão: 10)
    """
    try:
        with contextlib.closing(get_db_connection()) as conn:
            cursor = conn.cursor()
            
            # Busca flexível
            search_name = f"%{card_name}%"
            cursor.execute(f"""
                SELECT {CARD_SELECT_COLUMNS}
                FROM cards 
                WHERE name LIKE ? 
                ORDER BY 
                    CASE WHEN name LIKE ? THEN 1 ELSE 2 END,
                    name ASC,
                    set_code DESC,
                    collector_number ASC
                LIMIT ?
            """, (search_name, f"{card_name}%", limit))
                        
            results = [dict(row) for row in cursor.fetchall()]
            
            return {
                "card": card_name,
                "results": results,
                "count": len(results)
            }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar carta: {str(e)}"
        )

@app.get("/printings/{card_name:path}")
async def get_card_printings(card_name: str):
    """
    Retorna todas as impressões de uma carta específica.
    
    Filtra cartas sem imagem para não mostrar opções em branco no modal.
    """
    try:
        with contextlib.closing(get_db_connection()) as conn:
            cursor = conn.cursor()
            
            # Pega apenas a frente do nome (antes do //) para a busca
            search_name = card_name.split('//')[0].strip()
            
            # Buscar todas as impressões da carta, ignorando maiúsculas/minúsculas
            # Filtrando apenas cartas que têm imagem
            cursor.execute(f"""
                SELECT {CARD_SELECT_COLUMNS}
                FROM cards 
                WHERE name LIKE ?
                COLLATE NOCASE
                AND image_uri_normal IS NOT NULL 
                AND image_uri_normal != ''
                ORDER BY set_code DESC, collector_number ASC
            """, (search_name + '%',))
            
            results = [dict(row) for row in cursor.fetchall()]
            
            print(f" Encontradas {len(results)} impressões para '{card_name}'")
            
            return results
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar impressões: {str(e)}"
        )

@app.get("/cards/{card_id}/printings")
async def get_card_printings_by_id(card_id: str):
    """
    Retorna todas as impressões relacionadas à mesma carta usando oracle_id.

    Esse endpoint é mais confiável do que buscar por nome, especialmente para:
    - cartas dupla-face
    - nomes com //
    - versões promocionais
    - cartas com nomes parecidos
    """
    try:
        with contextlib.closing(get_db_connection()) as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT oracle_id
                FROM cards
                WHERE id = ?
                LIMIT 1
            """, (card_id,))

            row = cursor.fetchone()

            if not row or not row["oracle_id"]:
                raise HTTPException(
                    status_code=404,
                    detail="Carta não encontrada ou sem oracle_id."
                )

            oracle_id = row["oracle_id"]

            cursor.execute(f"""
                SELECT {CARD_SELECT_COLUMNS}
                FROM cards
                WHERE oracle_id = ?
                  AND image_uri_normal IS NOT NULL
                  AND image_uri_normal != ''
                  AND layout != 'art_series'
                ORDER BY
                    CASE
                        WHEN lang = 'en' THEN 1
                        WHEN lang = 'pt' THEN 2
                        ELSE 3
                    END ASC,
                    released_at DESC,
                    set_code ASC,
                    CAST(collector_number AS INTEGER) ASC
            """, (oracle_id,))

            results = [dict(row) for row in cursor.fetchall()]

            return {
                "card_id": card_id,
                "oracle_id": oracle_id,
                "count": len(results),
                "results": results
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar impressões por id: {str(e)}"
        )

@app.get("/stats")
async def get_stats():
    """Retorna estatísticas do banco de dados."""
    try:
        with contextlib.closing(get_db_connection()) as conn:
            cursor = conn.cursor()
            
            # Estatísticas gerais
            cursor.execute("SELECT COUNT(*) FROM cards")
            total_cards = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(DISTINCT name) FROM cards")
            unique_names = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(DISTINCT set_code) FROM cards")
            unique_sets = cursor.fetchone()[0]
            
            # Sets mais comuns
            cursor.execute("""
                SELECT set_code, COUNT(*) as count
                FROM cards
                GROUP BY set_code
                ORDER BY count DESC
                LIMIT 10
            """)
            top_sets = [dict(row) for row in cursor.fetchall()]
            
            return {
                "total_cards": total_cards,
                "unique_names": unique_names,
                "unique_sets": unique_sets,
                "top_sets": top_sets
            }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao obter estatísticas: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 50)
    print("Deck Fill API Server")
    print("=" * 50)
    
    # Verificar se banco de dados existe
    if not Path(DB_FILE).exists():
        print(f"❌ Erro: Banco de dados '{DB_FILE}' não encontrado!")
        print("Execute 'python sync_db.py' primeiro.")
        exit(1)
    
    print(f"✅ Banco de dados encontrado: {DB_FILE}")
    print(f"🚀 Iniciando servidor na porta {PORT}")
    print(f"📖 Docs: http://localhost:{PORT}/docs")
    print(f"🔍 Health: http://localhost:{PORT}/health")
    print("=" * 50)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=True,
        log_level="info"
    )

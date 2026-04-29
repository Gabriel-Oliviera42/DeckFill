#!/usr/bin/env python3
"""
Deck Fill - Backend API
FastAPI server para processar decklists e buscar cartas no banco de dados local.
"""

import sqlite3
import re
import time
import contextlib
from typing import List, Dict, Any, Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configurações
DB_FILE = "cards.db"
PORT = 8000

# Modelos Pydantic
class CardResponse(BaseModel):
    id: str
    name: str
    set_code: str
    collector_number: str
    image_uri_normal: Optional[str] = None
    image_uri_png: Optional[str] = None
    image_uri_back_normal: Optional[str] = None
    image_uri_back_png: Optional[str] = None
    lang: str = "en"

class DeckParseRequest(BaseModel):
    decklist: str

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

def parse_decklist(decklist: str) -> List[Dict[str, Any]]:
    """
    Parse de decklist usando regex.
    
    Suporta formatos:
    - "1x Lightning Bolt"
    - "1 Lightning Bolt" 
    - "Lightning Bolt"
    - "4 Thantis, the Warweaver"
    
    NOTA: Phase 5.1 deve adicionar suporte para "(SET) #number"
    """
    cards = []
    errors = []
    
    # Regex patterns para diferentes formatos
    patterns = [
        # Quantidade + nome + set + número (ex: "1x Demonic Tutor (UMA) 93")
        r'^\s*(\d+)\s*x\s*(.+?)\s*\(([A-Z0-9]{3,4})\)\s*(\d+)\s*$',
        # Quantidade + nome + set + número (ex: "1 Demonic Tutor (UMA) 93")
        r'^\s*(\d+)\s+(.+?)\s*\(([A-Z0-9]{3,4})\)\s*(\d+)\s*$',
        # Quantidade + nome + set (ex: "1x Demonic Tutor (UMA)")
        r'^\s*(\d+)\s*x\s*(.+?)\s*\(([A-Z0-9]{3,4})\)\s*$',
        # Quantidade + nome + set (ex: "1 Demonic Tutor (UMA)")
        r'^\s*(\d+)\s+(.+?)\s*\(([A-Z0-9]{3,4})\)\s*$',
        # Quantidade + nome (com "x")
        r'^\s*(\d+)\s*x\s*(.+?)\s*$',
        # Quantidade + nome (sem "x")
        r'^\s*(\d+)\s+(.+?)\s*$',
        # Apenas nome (assume quantidade 1)
        r'^\s*(.+?)\s*$'
    ]
    
    lines = decklist.strip().split('\n')
    
    for line_num, line in enumerate(lines, 1):
        line = line.strip()
        # Remove pontos finais no fim da linha (ex: "Phyrexian Ingester.")
        line = line.rstrip('.')
        
        # Ignorar linvas vazias e comentários
        if not line or line.startswith('//') or line.startswith('#'):
            continue
        
        card_found = False
        
        for pattern in patterns:
            match = re.match(pattern, line, re.IGNORECASE)
            if match:
                try:
                    # Processar diferentes números de grupos de captura
                    groups = match.groups()
                    
                    if len(groups) == 4:
                        # Formato: quantidade + nome + set + número
                        quantity = int(groups[0])
                        card_name = groups[1].strip()
                        set_code = groups[2].upper()
                        collector_number = groups[3]
                    elif len(groups) == 3:
                        # Formato: quantidade + nome + set
                        quantity = int(groups[0])
                        card_name = groups[1].strip()
                        set_code = groups[2].upper()
                        collector_number = None
                    elif len(groups) == 2:
                        # Formato: quantidade + nome
                        quantity = int(groups[0])
                        card_name = groups[1].strip()
                        set_code = None
                        collector_number = None
                    else:
                        # Formato: apenas nome
                        quantity = 1
                        card_name = groups[0].strip()
                        set_code = None
                        collector_number = None
                    
                    # Limpar nome da carta (remover extras)
                    card_name = re.sub(r'\s+', ' ', card_name).strip()
                    
                    # DEBUG - Raio-X: Parser extraiu quantidade e nome
                    print(f"🔍 DEBUG - Parser extraiu: Qtd: {quantity}, Nome: '{card_name}', Set: {set_code}, Num: {collector_number}")
                    
                    if quantity > 0 and card_name:
                        cards.append({
                            'quantity': quantity,
                            'name': card_name,
                            'set_code': set_code,
                            'collector_number': collector_number,
                            'line_number': line_num
                        })
                        card_found = True
                        break
                        
                except ValueError as e:
                    errors.append(f"Linha {line_num}: Erro ao processar quantidade - {line}")
                    break
        
        if not card_found:
            errors.append(f"Linha {line_num}: Formato não reconhecido - {line}")
    
    return cards, errors

def search_cards(parsed_cards: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Busca cartas no banco de dados usando os índices otimizados.
    
    Args:
        parsed_cards: Lista de dicionários com quantity, name, set_code, collector_number
    
    Returns:
        Dict com nome da carta como chave e lista de resultados como valor.
    """
    results = {}
    with contextlib.closing(get_db_connection()) as conn:
        cursor = conn.cursor()
        
        for card in parsed_cards:  # INÍCIO DO LOOP
            card_name = card["name"]
            found_cards = []
            
            # DEBUG - Raio-X: Buscando carta
            print(f"🔍 DEBUG - Buscando no banco: '{card_name}'")
            
            # 1. Tenta busca exata
            cursor.execute("""
                SELECT id, name, set_code, collector_number, image_uri_normal, image_uri_png, image_uri_back_normal, image_uri_back_png, lang
                FROM cards 
                WHERE name = ? COLLATE NOCASE
                ORDER BY 
                    CASE 
                        WHEN set_code = 'SLD' THEN 1
                        WHEN set_code = 'MPS' THEN 2
                        WHEN set_code = 'EXP' THEN 3
                        WHEN set_code = 'STA' THEN 4
                        WHEN set_code = '2X2' THEN 5
                        WHEN set_code = 'MH3' THEN 6
                        WHEN set_code = 'MH2' THEN 7
                        WHEN set_code = 'PRM' THEN 8
                        ELSE 9 
                    END ASC,
                    set_code DESC,
                    CAST(collector_number AS INTEGER) ASC
                LIMIT 10
            """, (card_name,))
            
            exact_rows = cursor.fetchall()
            if exact_rows:
                found_cards = [dict(row) for row in exact_rows]
                print(f"🔍 DEBUG - Busca exata encontrou {len(found_cards)} cartas para '{card_name}'")
            else:
                # 2. Só tenta parcial se a exata falhar
                search_name = f"%{card_name}%"
                cursor.execute("""
                    SELECT id, name, set_code, collector_number, image_uri_normal, image_uri_png, image_uri_back_normal, image_uri_back_png, lang
                    FROM cards 
                    WHERE name LIKE ? COLLATE NOCASE
                    ORDER BY 
                        CASE WHEN name LIKE ? THEN 1 ELSE 2 END,
                        CASE 
                            WHEN set_code = 'SLD' THEN 1
                            WHEN set_code = 'MPS' THEN 2
                            WHEN set_code = 'EXP' THEN 3
                            WHEN set_code = 'STA' THEN 4
                            WHEN set_code = '2X2' THEN 5
                            WHEN set_code = 'MH3' THEN 6
                            WHEN set_code = 'MH2' THEN 7
                            WHEN set_code = 'PRM' THEN 8
                            ELSE 9 
                        END ASC,
                        name ASC,
                        set_code DESC,
                        CAST(collector_number AS INTEGER) ASC
                    LIMIT 10
                """, (search_name, f"{card_name}%"))
                
                partial_rows = cursor.fetchall()
                found_cards = [dict(row) for row in partial_rows]
                print(f"🔍 DEBUG - Busca parcial encontrou {len(found_cards)} cartas para '{card_name}'")
                
            # 3. SALVA DENTRO DO LOOP
            results[card_name] = found_cards
            print(f"🔍 DEBUG - {card_name} salva com {len(found_cards)} cartas")
            
        # FIM DO LOOP
    return results

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
    
    # DEBUG - Raio-X: Entrada do /parse-deck
    print(f"🔍 DEBUG - Recebido do frontend: {repr(request.decklist)}")
    
    try:
        # 1. Parse do decklist
        parsed_cards, parse_errors = parse_decklist(request.decklist)
        print(f"🔍 DEBUG - Parser retornou {len(parsed_cards)} cartas e {len(parse_errors)} erros")
        
        # 2. Buscar cartas no banco (agora com informações de set/number)
        unique_parsed_cards = []
        seen_names = set()
        
        for card in parsed_cards:
            if card['name'] not in seen_names:
                unique_parsed_cards.append(card)
                seen_names.add(card['name'])
        
        search_results = search_cards(unique_parsed_cards)
        
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
            cursor.execute("""
                SELECT id, name, set_code, collector_number, image_uri_normal, image_uri_png, lang
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
            cursor.execute("""
                SELECT id, name, set_code, collector_number, image_uri_normal, image_uri_png, image_uri_back_normal, image_uri_back_png
                FROM cards 
                WHERE name LIKE ? COLLATE NOCASE 
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

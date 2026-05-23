"""
Magic Provider

Contém a lógica específica de Magic: The Gathering:
- conexão com o banco atual de cartas
- parse de decklist Magic
- busca de cartas Magic no SQLite
"""

import sqlite3
import re
import contextlib
from pathlib import Path
from typing import List, Dict, Any

from fastapi import HTTPException


DB_FILE = "cards.db"


def get_db_connection() -> sqlite3.Connection:
    """Obtém uma conexão limpa com o banco de dados (Thread-Safe)."""
    if not Path(DB_FILE).exists():
        raise HTTPException(
            status_code=500,
            detail=f"Banco de dados '{DB_FILE}' não encontrado. Execute sync_db.py primeiro."
        )

    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
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
        # 1. Formato com tudo no parênteses (ex: "1 Black Lotus (YDMU #35)" ou "1x Lotus (YDMU 35)")
        r'^\s*(\d+)\s*[xX]?\s*(.+?)\s*\(\s*([A-Za-z0-9]{3,5})\s*(?:#|/|-)?\s*([A-Za-z0-9\-]+)\s*\)\s*$',
        
        # 2. Formato original Arena (ex: "1 Black Lotus (YDMU) 35" ou "1x Lotus (YDMU) #35")
        r'^\s*(\d+)\s*[xX]?\s*(.+?)\s*\(\s*([A-Za-z0-9]{3,5})\s*\)\s*#?\s*([A-Za-z0-9\-]+)\s*$',
        
        # 3. Formato apenas com Set (ex: "1 Demonic Tutor (UMA)")
        r'^\s*(\d+)\s*[xX]?\s*(.+?)\s*\(\s*([A-Za-z0-9]{3,5})\s*\)\s*$',
        
        # 4. Formato sem set/numero (ex: "1x Demonic Tutor" ou "1 Demonic Tutor")
        r'^\s*(\d+)\s*[xX]?\s+(.+?)\s*$',
        
        # 5. Apenas o nome (assume quantidade 1)
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
                    
                    # Limpar nome da carta (remover extras e //)
                    card_name = card_name.split('//')[0].strip()
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
            set_code = card.get("set_code")
            collector_number = card.get("collector_number")
            found_cards = []
            
            # DEBUG - Raio-X: Buscando carta
            print(f"DEBUG - Buscando no banco: '{card_name}' (Set: {set_code}, Num: {collector_number})")
            
            # 1. Se temos set e number, tenta busca exata específica PRIMEIRO
            if set_code and collector_number:
                cursor.execute(f"""
                    SELECT {CARD_SELECT_COLUMNS}
                    FROM cards 
                    WHERE set_code COLLATE NOCASE = ? COLLATE NOCASE 
                    AND CAST(collector_number AS TEXT) COLLATE NOCASE = ? COLLATE NOCASE
                    LIMIT 1
                """, (set_code, str(collector_number)))
                
                exact_match_rows = cursor.fetchall()
                print(f"DEBUG SQL - Buscando: {card_name} | {set_code} | {collector_number} -> Retornou {len(exact_match_rows)} cartas")
                if exact_match_rows:
                    found_cards = [dict(row) for row in exact_match_rows]
                    print(f"DEBUG - Match EXATO (set+num) encontrado para '{card_name}' ({set_code} #{collector_number})")
                else:
                    print(f"DEBUG - Match EXATO (set+num) NÃO encontrado para '{card_name}' ({set_code} #{collector_number})")
            
            # 2. Se não encontrou match exato ou não tem set/num, tenta busca por nome apenas
            if not found_cards:
                cursor.execute(f"""
                    SELECT {CARD_SELECT_COLUMNS}
                    FROM cards 
                    WHERE name = ? COLLATE NOCASE
                    ORDER BY 
                        set_code DESC,
                        CAST(collector_number AS INTEGER) ASC
                    LIMIT 10
                """, (card_name,))
                
                exact_rows = cursor.fetchall()
                if exact_rows:
                    found_cards = [dict(row) for row in exact_rows]
                    print(f"DEBUG - Busca por nome encontrou {len(found_cards)} cartas para '{card_name}'")
                else:
                    # 3. Só tenta parcial se a exata falhar
                    import re
                    # Substitui vogais e caracteres não-alfanuméricos por '_' (coringa de 1 caractere do SQL)
                    loose_name = re.sub(r'[aeiouAEIOU\-.,\']', '_', card_name)
                    search_name = f"%{loose_name}%"
                    cursor.execute(f"""
                        SELECT {CARD_SELECT_COLUMNS}
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

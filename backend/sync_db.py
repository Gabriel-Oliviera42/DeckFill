#!/usr/bin/env python3
"""
Deck Fill - Database Sync Script
Baixa e processa o Scryfall Bulk Data para criar um banco de dados local.
"""

import sqlite3
import requests
import json
import sys
import time
from pathlib import Path
from typing import Dict, Any, List

# Configurações
BULK_DATA_API = "https://api.scryfall.com/bulk-data"
DB_FILE = "cards.db"
DEFAULT_CARDS_TYPE = "default_cards"

def log(message: str) -> None:
    """Exibe logs com timestamp."""
    timestamp = time.strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}")

def get_default_cards_uri() -> str:
    """Obtém a URI de download do Default Cards do Scryfall."""
    log("Buscando informações do Bulk Data...")
    
    try:
        response = requests.get(BULK_DATA_API)
        response.raise_for_status()
        
        bulk_data = response.json()
        
        # Encontrar o Default Cards
        for item in bulk_data['data']:
            if item['type'] == DEFAULT_CARDS_TYPE:
                log(f"Default Cards encontrado: {item['name']}")
                log(f"Tamanho: {item['size'] / 1024 / 1024:.1f} MB")
                log(f"Atualizado em: {item['updated_at']}")
                return item['download_uri']
        
        raise ValueError(f"Tipo '{DEFAULT_CARDS_TYPE}' não encontrado no Bulk Data")
        
    except requests.RequestException as e:
        log(f"Erro ao buscar Bulk Data: {e}")
        sys.exit(1)
    except KeyError as e:
        log(f"Erro ao processar resposta da API: {e}")
        sys.exit(1)

def download_cards_file(uri: str) -> str:
    """Baixa o arquivo JSON das cartas."""
    log("Iniciando download do arquivo de cartas...")
    
    try:
        response = requests.get(uri, stream=True)
        response.raise_for_status()
        
        # Salvar arquivo temporário
        temp_file = "temp_cards.json.gz"
        
        with open(temp_file, 'wb') as f:
            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0
            
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    
                    # Progress bar
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"\rProgresso: {percent:.1f}%", end='', flush=True)
        
        print()  # Nova linha após o progress bar
        log(f"Download concluído: {temp_file}")
        return temp_file
        
    except requests.RequestException as e:
        log(f"Erro no download: {e}")
        sys.exit(1)

def create_database() -> sqlite3.Connection:
    """Cria e configura o banco de dados SQLite."""
    log("Criando banco de dados...")
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Criar tabela de cartas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cards (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            layout TEXT,
            set_code TEXT NOT NULL,
            collector_number TEXT NOT NULL,
            image_uri_normal TEXT,
            image_uri_png TEXT,
            image_uri_back_normal TEXT,
            image_uri_back_png TEXT,
            lang TEXT DEFAULT 'en'
        )
    ''')
    
    # Criar índice para busca rápida por nome
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name)
    ''')
    
    # Criar índice para busca por set
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_cards_set ON cards(set_code)
    ''')
    
    conn.commit()
    log("Banco de dados criado com sucesso")
    return conn

def extract_card_data(card: Dict[str, Any]) -> Dict[str, Any]:
    # Usa 'or {}' para garantir que se o Scryfall mandar null, vira um dicionário vazio
    image_uris = card.get('image_uris') or {}
    back_image_uris = {}
    
    if 'card_faces' in card and len(card['card_faces']) > 1:
        # Pega a face 0 de forma segura
        face0 = card['card_faces'][0]
        image_uris = face0.get('image_uris') or image_uris
        
        # Pega a face 1 de forma segura
        face1 = card['card_faces'][1]
        back_image_uris = face1.get('image_uris') or {}

    return {
        'id': card.get('id'),
        'name': card.get('name'),
        'layout': card.get('layout', 'normal'),
        'set_code': card.get('set', '').upper(),
        'collector_number': str(card.get('collector_number', '')),
        'image_uri_normal': image_uris.get('normal'),
        'image_uri_png': image_uris.get('png'),
        'image_uri_back_normal': back_image_uris.get('normal'),
        'image_uri_back_png': back_image_uris.get('png'),
        'lang': card.get('lang', 'en')
    }

def process_cards_file(file_path: str, conn: sqlite3.Connection) -> None:
    """Processa o arquivo JSON e insere as cartas no banco."""
    log("Processando arquivo de cartas...")
    
    cursor = conn.cursor()
    cards_processed = 0
    cards_inserted = 0
    start_time = time.time()
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            # Ler linha por linha para economizar memória
            for line_num, line in enumerate(f, 1):
                try:
                    # O arquivo é um array JSON, então precisamos processar diferente
                    if line_num == 1:
                        # Primeira linha contém "["
                        continue
                    
                    # Remover vírgulas e colchetes para parse correto
                    clean_line = line.strip().rstrip(',')
                    if clean_line in ['[', ']', '']:
                        continue
                    
                    card = json.loads(clean_line)
                    card_data = extract_card_data(card)
                    
                    # Verificar se temos os campos essenciais (pelo menos ID, nome e uma imagem)
                    has_essential_fields = (
                        card_data['id'] and 
                        card_data['name'] and 
                        card_data['set_code'] and
                        (card_data['image_uri_normal'] or card_data['image_uri_png'] or 
                         card_data['image_uri_back_normal'] or card_data['image_uri_back_png'])
                    )
                    
                    if has_essential_fields:
                        cursor.execute('''
                            INSERT OR REPLACE INTO cards 
                            (id, name, layout, set_code, collector_number, image_uri_normal, image_uri_png, image_uri_back_normal, image_uri_back_png, lang)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            card_data['id'],
                            card_data['name'],
                            card_data['layout'],
                            card_data['set_code'],
                            card_data['collector_number'],
                            card_data['image_uri_normal'],
                            card_data['image_uri_png'],
                            card_data['image_uri_back_normal'],
                            card_data['image_uri_back_png'],
                            card_data['lang']
                        ))
                        cards_inserted += 1
                    
                    cards_processed += 1
                    
                    # Progress a cada 10000 cartas
                    if cards_processed % 10000 == 0:
                        elapsed = time.time() - start_time
                        rate = cards_processed / elapsed
                        log(f"Processadas {cards_processed:,} cartas ({rate:.1f} cartas/s)")
                        
                except json.JSONDecodeError as e:
                    log(f"Erro ao processar linha {line_num}: {e}")
                    continue
                except Exception as e:
                    log(f"Erro inesperado na linha {line_num}: {e}")
                    continue
        
        conn.commit()
        
        elapsed = time.time() - start_time
        log(f"Processamento concluído!")
        log(f"Cartas processadas: {cards_processed:,}")
        log(f"Cartas inseridas: {cards_inserted:,}")
        log(f"Tempo total: {elapsed:.1f} segundos")
        log(f"Média: {cards_processed / elapsed:.1f} cartas/s")
        
    except FileNotFoundError:
        log(f"Arquivo não encontrado: {file_path}")
        sys.exit(1)
    except Exception as e:
        log(f"Erro ao processar arquivo: {e}")
        sys.exit(1)

def cleanup_temp_file(file_path: str) -> None:
    """Remove o arquivo temporário."""
    try:
        Path(file_path).unlink()
        log(f"Arquivo temporário removido: {file_path}")
    except Exception as e:
        log(f"Aviso: não foi possível remover {file_path}: {e}")

def main() -> None:
    """Função principal."""
    log("=" * 50)
    log("Deck Fill - Database Sync")
    log("=" * 50)
    
    total_start = time.time()
    
    try:
        # 1. Obter URI do Default Cards
        download_uri = get_default_cards_uri()
        
        # 2. Baixar arquivo
        temp_file = download_cards_file(download_uri)
        
        # 3. Criar banco de dados
        conn = create_database()
        
        # 4. Processar e inserir cartas
        process_cards_file(temp_file, conn)
        
        # 5. Limpar
        cleanup_temp_file(temp_file)
        
        # 6. Estatísticas finais
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM cards")
        total_cards = cursor.fetchone()[0]
        
        total_elapsed = time.time() - total_start
        log("=" * 50)
        log(f"Sincronização concluída com sucesso!")
        log(f"Total de cartas no banco: {total_cards:,}")
        log(f"Tempo total: {total_elapsed:.1f} segundos")
        log(f"Banco de dados: {DB_FILE}")
        log("=" * 50)
        
        conn.close()
        
    except KeyboardInterrupt:
        log("\nSincronização interrompida pelo usuário")
        sys.exit(1)
    except Exception as e:
        log(f"Erro fatal: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

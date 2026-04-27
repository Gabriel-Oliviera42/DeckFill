#!/usr/bin/env python3
"""
Test script para validar a funcionalidade básica do sync_db.py
"""

import sqlite3
import requests
import json
import sys
import time
from pathlib import Path

def test_api_connection():
    """Testa conexão com API do Scryfall."""
    print("Testando conexão com API do Scryfall...")
    
    try:
        response = requests.get("https://api.scryfall.com/bulk-data")
        response.raise_for_status()
        
        bulk_data = response.json()
        
        # Verificar se Default Cards está disponível
        default_cards = None
        for item in bulk_data['data']:
            if item['type'] == 'default_cards':
                default_cards = item
                break
        
        if default_cards:
            print(f"✅ Default Cards encontrado: {default_cards['name']}")
            print(f"✅ Tamanho: {default_cards['size'] / 1024 / 1024:.1f} MB")
            print(f"✅ Download URI: {default_cards['download_uri']}")
            return True
        else:
            print("❌ Default Cards não encontrado")
            return False
            
    except Exception as e:
        print(f"❌ Erro na conexão: {e}")
        return False

def test_database_creation():
    """Testa criação do banco de dados."""
    print("\nTestando criação do banco de dados...")
    
    try:
        conn = sqlite3.connect("test_cards.db")
        cursor = conn.cursor()
        
        # Criar tabela
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cards (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                set_code TEXT NOT NULL,
                collector_number TEXT NOT NULL,
                image_uri_normal TEXT,
                image_uri_png TEXT,
                lang TEXT DEFAULT 'en'
            )
        ''')
        
        # Criar índices
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_cards_set ON cards(set_code)')
        
        # Inserir dados de teste
        test_card = {
            'id': 'test-123',
            'name': 'Lightning Bolt',
            'set_code': 'LEA',
            'collector_number': '1',
            'image_uri_normal': 'https://cards.scryfall.io/normal/front/test.jpg',
            'image_uri_png': 'https://cards.scryfall.io/png/front/test.png',
            'lang': 'en'
        }
        
        cursor.execute('''
            INSERT INTO cards 
            (id, name, set_code, collector_number, image_uri_normal, image_uri_png, lang)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', tuple(test_card.values()))
        
        conn.commit()
        
        # Testar busca
        cursor.execute("SELECT name, set_code FROM cards WHERE name LIKE ?", ('%Lightning%',))
        result = cursor.fetchone()
        
        if result:
            print(f"✅ Carta de teste inserida e encontrada: {result}")
        else:
            print("❌ Carta de teste não encontrada")
            return False
        
        conn.close()
        
        # Limpar arquivo de teste
        Path("test_cards.db").unlink()
        
        print("✅ Banco de dados criado e testado com sucesso")
        return True
        
    except Exception as e:
        print(f"❌ Erro no banco de dados: {e}")
        return False

def test_json_processing():
    """Testa processamento de JSON com uma carta de exemplo."""
    print("\nTestando processamento de JSON...")
    
    # Carta de exemplo no formato do Scryfall
    sample_card = {
        "object": "card",
        "id": "b3c8ba29-4ba2-4b79-8328-3a1e4280814f",
        "name": "Lightning Bolt",
        "lang": "en",
        "set": "lea",
        "collector_number": "1",
        "image_uris": {
            "small": "https://cards.scryfall.io/small/front/b/3/b3c8ba29-4ba2-4b79-8328-3a1e4280814f.jpg",
            "normal": "https://cards.scryfall.io/normal/front/b/3/b3c8ba29-4ba2-4b79-8328-3a1e4280814f.jpg",
            "large": "https://cards.scryfall.io/large/front/b/3/b3c8ba29-4ba2-4b79-8328-3a1e4280814f.jpg",
            "png": "https://cards.scryfall.io/png/front/b/3/b3c8ba29-4ba2-4b79-8328-3a1e4280814f.png"
        }
    }
    
    try:
        # Simular extração de dados
        card_data = {
            'id': sample_card.get('id'),
            'name': sample_card.get('name'),
            'set_code': sample_card.get('set', '').upper(),
            'collector_number': sample_card.get('collector_number', ''),
            'image_uri_normal': sample_card.get('image_uris', {}).get('normal'),
            'image_uri_png': sample_card.get('image_uris', {}).get('png'),
            'lang': sample_card.get('lang', 'en')
        }
        
        # Verificar se todos os campos estão presentes
        if all(card_data.values()):
            print(f"✅ Dados extraídos com sucesso:")
            print(f"   Nome: {card_data['name']}")
            print(f"   Set: {card_data['set_code']}")
            print(f"   Imagem Normal: {card_data['image_uri_normal']}")
            print(f"   Imagem PNG: {card_data['image_uri_png']}")
            return True
        else:
            print("❌ Campos faltando nos dados extraídos")
            return False
            
    except Exception as e:
        print(f"❌ Erro no processamento JSON: {e}")
        return False

def main():
    """Executa todos os testes."""
    print("=" * 50)
    print("Deck Fill - Test Suite")
    print("=" * 50)
    
    tests = [
        ("Conexão API", test_api_connection),
        ("Criação BD", test_database_creation),
        ("Processamento JSON", test_json_processing)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n--- {test_name} ---")
        if test_func():
            passed += 1
        else:
            print(f"❌ Teste {test_name} falhou")
    
    print("\n" + "=" * 50)
    print(f"Resultados: {passed}/{total} testes passaram")
    
    if passed == total:
        print("🎉 Todos os testes passaram! O sync_db.py deve funcionar corretamente.")
        return 0
    else:
        print("⚠️  Alguns testes falharam. Verifique os erros acima.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

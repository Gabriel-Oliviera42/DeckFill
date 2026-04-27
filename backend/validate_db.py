#!/usr/bin/env python3
"""
Validação do banco de dados cards.db criado pelo sync_db.py
"""

import sqlite3
import sys
from pathlib import Path

def validate_database():
    """Valida estrutura e conteúdo do banco de dados."""
    print("=== VALIDAÇÃO DO BANCO DE DADOS ===")
    
    if not Path("cards.db").exists():
        print("❌ Arquivo cards.db não encontrado")
        return False
    
    try:
        conn = sqlite3.connect("cards.db")
        cursor = conn.cursor()
        
        # 1. Verificar estrutura da tabela
        print("\n1. Estrutura da tabela:")
        cursor.execute("PRAGMA table_info(cards)")
        columns = cursor.fetchall()
        
        expected_columns = {
            'id': 'TEXT',
            'name': 'TEXT', 
            'set_code': 'TEXT',
            'collector_number': 'TEXT',
            'image_uri_normal': 'TEXT',
            'image_uri_png': 'TEXT',
            'lang': 'TEXT'
        }
        
        for col in columns:
            col_name = col[1]
            col_type = col[2]
            if col_name in expected_columns:
                print(f"   ✅ {col_name}: {col_type}")
                expected_columns.pop(col_name)
            else:
                print(f"   ⚠️  Coluna inesperada: {col_name}")
        
        if expected_columns:
            print(f"   ❌ Colunas faltando: {list(expected_columns.keys())}")
            return False
        
        # 2. Verificar índices
        print("\n2. Índices criados:")
        cursor.execute("PRAGMA index_list(cards)")
        indexes = cursor.fetchall()
        
        expected_indexes = ['idx_cards_name', 'idx_cards_set']
        found_indexes = []
        
        for idx in indexes:
            idx_name = idx[1]
            if idx_name in expected_indexes:
                print(f"   ✅ {idx_name}")
                found_indexes.append(idx_name)
        
        missing_indexes = set(expected_indexes) - set(found_indexes)
        if missing_indexes:
            print(f"   ❌ Índices faltando: {missing_indexes}")
            return False
        
        # 3. Estatísticas gerais
        print("\n3. Estatísticas do banco:")
        cursor.execute("SELECT COUNT(*) FROM cards")
        total_cards = cursor.fetchone()[0]
        print(f"   📊 Total de cartas: {total_cards:,}")
        
        # 4. Verificar dados de exemplo
        print("\n4. Amostra de dados:")
        cursor.execute("""
            SELECT name, set_code, collector_number, lang 
            FROM cards 
            WHERE name LIKE '%Lightning%' 
            ORDER BY set_code 
            LIMIT 5
        """)
        lightning_cards = cursor.fetchall()
        
        if lightning_cards:
            print("   ⚡ Cartas 'Lightning' encontradas:")
            for card in lightning_cards:
                print(f"      - {card[0]} ({card[1]} #{card[2]}) [{card[3]}]")
        else:
            print("   ⚠️  Nenhuma carta 'Lightning' encontrada")
        
        # 5. Verificar imagens
        print("\n5. Verificação de imagens:")
        cursor.execute("""
            SELECT COUNT(*) 
            FROM cards 
            WHERE image_uri_normal IS NOT NULL 
            AND image_uri_png IS NOT NULL
        """)
        cards_with_images = cursor.fetchone()[0]
        
        image_percentage = (cards_with_images / total_cards) * 100
        print(f"   🖼️  Cartas com imagens: {cards_with_images:,} ({image_percentage:.1f}%)")
        
        # 6. Verificar sets mais comuns
        print("\n6. Sets mais comuns:")
        cursor.execute("""
            SELECT set_code, COUNT(*) as count
            FROM cards
            GROUP BY set_code
            ORDER BY count DESC
            LIMIT 5
        """)
        top_sets = cursor.fetchall()
        
        for set_code, count in top_sets:
            print(f"      - {set_code}: {count:,} cartas")
        
        # 7. Teste de performance
        print("\n7. Teste de performance:")
        import time
        
        # Busca por nome
        start = time.time()
        cursor.execute("""
            SELECT name, set_code, image_uri_normal 
            FROM cards 
            WHERE name LIKE '%Black Lotus%' 
            LIMIT 10
        """)
        results = cursor.fetchall()
        search_time = time.time() - start
        
        print(f"   🔍 Busca por 'Black Lotus': {len(results)} resultados em {search_time*1000:.2f}ms")
        
        conn.close()
        
        print("\n=== VALIDAÇÃO CONCLUÍDA COM SUCESSO ✅ ===")
        return True
        
    except Exception as e:
        print(f"\n❌ Erro na validação: {e}")
        return False

if __name__ == "__main__":
    if validate_database():
        sys.exit(0)
    else:
        sys.exit(1)

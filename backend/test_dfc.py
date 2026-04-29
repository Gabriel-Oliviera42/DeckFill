#!/usr/bin/env python3
"""
Teste de Cartas Dupla-Face (DFCs)
Verifica se o banco de dados está capturando corretamente as imagens do verso.
"""

import sqlite3
from typing import Dict, Any

DB_FILE = "cards.db"

def test_dfc_cards():
    """Testa se cartas dupla-face foram capturadas corretamente."""
    print("🔍 Testando cartas dupla-face no banco de dados...")
    
    try:
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Testar 1: Gnottvold Hermit (conhecida DFC)
        print("\n📋 Teste 1: Gnottvold Hermit")
        cursor.execute("""
            SELECT name, layout, image_uri_png, image_uri_back_png 
            FROM cards 
            WHERE name LIKE '%Gnottvold Hermit%' 
            LIMIT 1
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"✅ Carta encontrada: {result['name']}")
            print(f"📄 Layout: {result['layout']}")
            print(f"🖼️  Imagem frente (PNG): {result['image_uri_png'] or '❌ NULL'}")
            print(f"🖼️  Imagem verso (PNG): {result['image_uri_back_png'] or '❌ NULL'}")
        else:
            print("❌ Gnottvold Hermit não encontrada")
        
        # Testar 2: Buscar todas as DFCs
        print("\n📋 Teste 2: Estatísticas de DFCs")
        cursor.execute("""
            SELECT 
                COUNT(*) as total_dfcs,
                COUNT(image_uri_back_png) as dfcs_with_back_image
            FROM cards 
            WHERE layout IN ('transform', 'modal_dfc', 'double_faced_token')
        """)
        
        stats = cursor.fetchone()
        print(f"📊 Total de DFCs: {stats['total_dfcs']}")
        print(f"📊 DFCs com imagem do verso: {stats['dfcs_with_back_image']}")
        
        # Testar 3: Exemplos de diferentes layouts
        print("\n📋 Teste 3: Exemplos de layouts")
        cursor.execute("""
            SELECT DISTINCT layout, COUNT(*) as count
            FROM cards 
            WHERE layout IS NOT NULL
            GROUP BY layout
            ORDER BY count DESC
            LIMIT 10
        """)
        
        layouts = cursor.fetchall()
        print("📈 Layouts encontrados:")
        for layout in layouts:
            print(f"  • {layout['layout']}: {layout['count']} cartas")
        
        conn.close()
        print("\n✅ Teste concluído com sucesso!")
        
    except sqlite3.Error as e:
        print(f"❌ Erro no banco de dados: {e}")
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")

if __name__ == "__main__":
    test_dfc_cards()

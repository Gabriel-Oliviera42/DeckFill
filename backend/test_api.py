#!/usr/bin/env python3
"""
Test script para validar a API Deck Fill
"""

import requests
import json
import time
import sys

# Configurações
API_BASE = "http://localhost:8000"

def test_health_check():
    """Testa o health check endpoint."""
    print("=== Teste: Health Check ===")
    
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        response.raise_for_status()
        
        data = response.json()
        print(f"✅ Status: {data['status']}")
        print(f"✅ Database: {data['database_connected']}")
        print(f"✅ Total Cards: {data['total_cards']:,}")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Servidor não está rodando. Inicie com: python main.py")
        return False
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

def test_parse_deck():
    """Testa o endpoint principal de parse de deck."""
    print("\n=== Teste: Parse Deck ===")
    
    # Decklist de teste
    test_decklist = """
4x Lightning Bolt
2 Island
1 Thantis, the Warweaver
3 Black Lotus
// Esta é uma linha de comentário
4 Force of Will
"""
    
    payload = {"decklist": test_decklist}
    
    try:
        response = requests.post(
            f"{API_BASE}/parse-deck",
            json=payload,
            timeout=10
        )
        response.raise_for_status()
        
        data = response.json()
        
        print(f"✅ Cartas processadas: {data['total_cards']}")
        print(f"✅ Tempo de processamento: {data['processing_time_ms']}ms")
        
        if data['errors']:
            print("⚠️  Erros encontrados:")
            for error in data['errors']:
                print(f"   - {error}")
        else:
            print("✅ Nenhum erro no parse")
        
        # Mostrar algumas cartas encontradas
        print("\n📋 Amostra de cartas encontradas:")
        for i, card in enumerate(data['cards'][:5]):
            print(f"   {i+1}. {card['name']} ({card['set_code']})")
        
        if len(data['cards']) > 5:
            print(f"   ... e mais {len(data['cards']) - 5} cartas")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

def test_search():
    """Testa o endpoint de busca."""
    print("\n=== Teste: Search ===")
    
    try:
        # Busca por Lightning Bolt
        response = requests.get(f"{API_BASE}/search/Lightning%20Bolt?limit=3", timeout=5)
        response.raise_for_status()
        
        data = response.json()
        
        print(f"✅ Query: {data['query']}")
        print(f"✅ Resultados: {data['total_found']}")
        
        for card in data['results']:
            print(f"   - {card['name']} ({card['set_code']} #{card['collector_number']})")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

def test_stats():
    """Testa o endpoint de estatísticas."""
    print("\n=== Teste: Stats ===")
    
    try:
        response = requests.get(f"{API_BASE}/stats", timeout=5)
        response.raise_for_status()
        
        data = response.json()
        
        print(f"✅ Total de cartas: {data['total_cards']:,}")
        print(f"✅ Nomes únicos: {data['unique_names']:,}")
        print(f"✅ Sets únicos: {data['unique_sets']}")
        
        print("\n📊 Top 5 Sets:")
        for i, set_data in enumerate(data['top_sets'][:5]):
            print(f"   {i+1}. {set_data['set_code']}: {set_data['count']:,} cartas")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

def test_performance():
    """Testa performance com decklist grande."""
    print("\n=== Teste: Performance ===")
    
    # Criar decklist grande para teste
    cards_to_test = [
        "Lightning Bolt", "Island", "Mountain", "Forest", "Swamp",
        "Black Lotus", "Ancestral Recall", "Time Walk", "Timetwister", "Mox Sapphire",
        "Mox Jet", "Mox Ruby", "Mox Pearl", "Mox Emerald", "Sol Ring"
    ]
    
    decklist = ""
    for card in cards_to_test:
        decklist += f"4x {card}\n"
    
    payload = {"decklist": decklist}
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{API_BASE}/parse-deck",
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        
        data = response.json()
        total_time = (time.time() - start_time) * 1000
        
        print(f"✅ Cartas processadas: {data['total_cards']}")
        print(f"✅ Tempo API: {data['processing_time_ms']}ms")
        print(f"✅ Tempo total: {total_time:.2f}ms")
        print(f"✅ Performance: {data['total_cards']/(data['processing_time_ms']/1000):.1f} cartas/s")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

def main():
    """Executa todos os testes."""
    print("=" * 50)
    print("Deck Fill API - Test Suite")
    print("=" * 50)
    
    tests = [
        ("Health Check", test_health_check),
        ("Parse Deck", test_parse_deck),
        ("Search", test_search),
        ("Stats", test_stats),
        ("Performance", test_performance)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        if test_func():
            passed += 1
        else:
            print(f"\n❌ Teste {test_name} falhou")
            break  # Para se health check falhar
    
    print("\n" + "=" * 50)
    print(f"Resultados: {passed}/{total} testes passaram")
    
    if passed == total:
        print("🎉 Todos os testes passaram! API está funcionando corretamente.")
        print("\n📖 Documentação disponível em: http://localhost:8000/docs")
        return 0
    else:
        print("⚠️  Alguns testes falharam. Verifique os erros acima.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

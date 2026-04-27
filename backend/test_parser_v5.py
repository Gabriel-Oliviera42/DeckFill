#!/usr/bin/env python3
"""
Test script para validar o Parser Inteligente Phase 5.1
Testa novos formatos com (SET) e #number
"""

import requests
import json
import sys

# Configurações
API_BASE = "http://localhost:8000"

def test_parser_v5():
    """Testa os novos formatos de parser com set e collector number."""
    print("=" * 60)
    print("Phase 5.1 - Parser Inteligente Test Suite")
    print("=" * 60)
    
    # Decklist com todos os formatos suportados
    test_decklist = """
# Formatos antigos (devem continuar funcionando)
4x Lightning Bolt
2 Island
1 Black Lotus

# Novos formatos Phase 5.1
1x Demonic Tutor (UMA) 93
2 Force of Will (EMA) 27
1 Tropical Island (VMA) 277
4 Brainstorm (EMA) 43

# Formatos com set apenas
1x Sol Ring (2ED)
2 Ancestral Recall (LEB)

# Formatos sem "x"
1 Lightning Bolt (LEA) 282
3 Island (VMA) 73

// Comentários devem ser ignorados
# Esta linha também

// Formatos misturados
4x Chain Lightning (EMA) 91
1 Volcanic Island (VMA) 280
"""
    
    print("📝 Decklist de teste:")
    print("-" * 40)
    print(test_decklist)
    print("-" * 40)
    
    try:
        print("\n🔄 Enviando para API...")
        
        response = requests.post(
            f"{API_BASE}/parse-deck",
            json={"decklist": test_decklist},
            timeout=30
        )
        response.raise_for_status()
        
        data = response.json()
        
        print(f"✅ Sucesso! Cartas processadas: {data['total_cards']}")
        print(f"⏱️  Tempo: {data['processing_time_ms']}ms")
        
        if data['errors']:
            print("\n⚠️  Erros encontrados:")
            for error in data['errors']:
                print(f"   - {error}")
        else:
            print("\n✅ Nenhum erro de parsing!")
        
        # Análise detalhada dos resultados
        print("\n📊 Análise dos resultados:")
        print("-" * 40)
        
        cards_by_name = {}
        for card in data['cards']:
            name = card['name']
            if name not in cards_by_name:
                cards_by_name[name] = []
            cards_by_name[name].append(card)
        
        expected_cards = [
            ("Lightning Bolt", 5),  # 4x + 1x
            ("Island", 5),         # 2x + 3x  
            ("Black Lotus", 1),
            ("Demonic Tutor", 1),
            ("Force of Will", 2),
            ("Tropical Island", 1),
            ("Brainstorm", 4),
            ("Sol Ring", 1),
            ("Ancestral Recall", 2),
            ("Chain Lightning", 4),
            ("Volcanic Island", 1)
        ]
        
        all_correct = True
        for card_name, expected_quantity in expected_cards:
            actual_quantity = len(cards_by_name.get(card_name, []))
            if actual_quantity == expected_quantity:
                print(f"✅ {card_name}: {actual_quantity}/{expected_quantity}")
            else:
                print(f"❌ {card_name}: {actual_quantity}/{expected_quantity}")
                all_correct = False
        
        # Verificar sets específicos
        print("\n🎯 Verificação de sets específicos:")
        print("-" * 40)
        
        specific_checks = [
            ("Demonic Tutor", "UMA", "93"),
            ("Force of Will", "EMA", "27"),
            ("Tropical Island", "VMA", "277"),
            ("Brainstorm", "EMA", "43"),
            ("Lightning Bolt", "LEA", "282")
        ]
        
        for card_name, expected_set, expected_number in specific_checks:
            cards = cards_by_name.get(card_name, [])
            found = False
            for card in cards:
                if card['set_code'] == expected_set and card['collector_number'] == expected_number:
                    print(f"✅ {card_name} ({expected_set}) #{expected_number}")
                    found = True
                    break
            
            if not found:
                print(f"❌ {card_name} ({expected_set}) #{expected_number} - não encontrado")
                all_correct = False
        
        print("\n" + "=" * 60)
        if all_correct:
            print("🎉 TODOS OS TESTES PASSARAM!")
            print("Parser Phase 5.1 está funcionando perfeitamente!")
        else:
            print("⚠️  Alguns testes falharam. Verifique os erros acima.")
        print("=" * 60)
        
        return all_correct
        
    except requests.exceptions.ConnectionError:
        print("❌ Erro: API não está online!")
        print("Inicie o servidor: python main.py")
        return False
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

def test_backward_compatibility():
    """Testa se formatos antigos ainda funcionam."""
    print("\n🔄 Testando compatibilidade com formatos antigos...")
    
    old_formats = """
4x Lightning Bolt
1 Black Lotus
2 Island
Force of Will
"""
    
    try:
        response = requests.post(
            f"{API_BASE}/parse-deck",
            json={"decklist": old_formats},
            timeout=10
        )
        response.raise_for_status()
        
        data = response.json()
        expected = 8  # 4+1+2+1
        
        if data['total_cards'] == expected and not data['errors']:
            print(f"✅ Compatibilidade mantida: {expected} cartas")
            return True
        else:
            print(f"❌ Compatibilidade quebrada: esperado {expected}, got {data['total_cards']}")
            return False
            
    except Exception as e:
        print(f"❌ Erro no teste de compatibilidade: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Iniciando testes do Parser Phase 5.1...")
    
    test1 = test_parser_v5()
    test2 = test_backward_compatibility()
    
    if test1 and test2:
        print("\n🎉 TODOS OS TESTES PASSARAM!")
        print("Parser Phase 5.1 está pronto para produção!")
        sys.exit(0)
    else:
        print("\n❌ ALGUNS TESTES FALHARAM!")
        print("Verifique os erros acima antes de continuar.")
        sys.exit(1)

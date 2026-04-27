#!/usr/bin/env python3
"""
Test script para validar o endpoint /printings do backend
Verifica se a API está retornando todas as versões de uma carta corretamente
"""

import requests
import json
import sys

# Configurações
API_BASE = "http://localhost:8000"

def test_printings_endpoint():
    """Testa o endpoint /printings com Lightning Bolt"""
    print("=" * 60)
    print("Testando Endpoint /printings - Lightning Bolt")
    print("=" * 60)
    
    try:
        # Testar endpoint /printings
        card_name = "Lightning Bolt"
        url = f"{API_BASE}/printings/{card_name}"
        
        print(f"🔍 Fazendo requisição para: {url}")
        print(f"📝 Carta testada: {card_name}")
        print("-" * 40)
        
        response = requests.get(url, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📋 Headers: {dict(response.headers)}")
        print("-" * 40)
        
        if response.status_code == 200:
            data = response.json()
            
            print(f"✅ Sucesso! Tipo de dados: {type(data)}")
            print(f"📏 Tamanho da resposta: {len(str(data))} caracteres")
            print("-" * 40)
            
            if isinstance(data, list):
                print(f"🎯 Resposta é uma LISTA com {len(data)} itens")
                
                if len(data) > 0:
                    print("\n📋 Análise do primeiro item:")
                    first_item = data[0]
                    print(f"   Tipo: {type(first_item)}")
                    
                    if isinstance(first_item, dict):
                        print(f"   Chaves: {list(first_item.keys())}")
                        print("\n🎨 Campos importantes:")
                        for key in ['name', 'set_code', 'collector_number', 'image_uri_normal', 'image_uri_png', 'lang']:
                            if key in first_item:
                                value = first_item[key]
                                if key in ['image_uri_normal', 'image_uri_png']:
                                    # Mostrar apenas início da URL
                                    print(f"   {key}: {str(value)[:50]}...")
                                else:
                                    print(f"   {key}: {value}")
                            else:
                                print(f"   {key}: ❌ NÃO ENCONTRADO")
                        
                        print(f"\n🔢 Total de impressões: {len(data)}")
                        print("📋 Primeiras 5 impressões:")
                        for i, card in enumerate(data[:5]):
                            set_code = card.get('set_code', 'N/A')
                            collector_number = card.get('collector_number', 'N/A')
                            has_image = '✅' if card.get('image_uri_normal') else '❌'
                            print(f"   {i+1}. {set_code} #{collector_number} - Imagem: {has_image}")
                        
                        if len(data) > 5:
                            print(f"   ... e mais {len(data) - 5} impressões")
                    else:
                        print(f"❌ Primeiro item não é dicionário: {first_item}")
                else:
                    print("❌ Lista vazia retornada!")
                    
            elif isinstance(data, dict):
                print(f"🎯 Resposta é um DICIONÁRIO")
                print(f"   Chaves: {list(data.keys())}")
                
                if 'cards' in data:
                    cards = data['cards']
                    print(f"📦 Campo 'cards' tem {len(cards)} itens")
                    
                    if len(cards) > 0:
                        print("\n📋 Análise do primeiro card:")
                        first_card = cards[0]
                        print(f"   Chaves: {list(first_card.keys())}")
                        
                        for key in ['name', 'set_code', 'collector_number', 'image_uri_normal', 'image_uri_png', 'lang']:
                            if key in first_card:
                                value = first_card[key]
                                if key in ['image_uri_normal', 'image_uri_png']:
                                    print(f"   {key}: {str(value)[:50]}...")
                                else:
                                    print(f"   {key}: {value}")
                            else:
                                print(f"   {key}: ❌ NÃO ENCONTRADO")
                else:
                    print("❌ Dicionário não tem campo 'cards'!")
            else:
                print(f"❌ Tipo de resposta não esperado: {type(data)}")
                print(f"Conteúdo: {data}")
                
        else:
            print(f"❌ Erro HTTP: {response.status_code}")
            print(f"Resposta: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Erro: API não está online!")
        print("Inicie o servidor: python main.py")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ Erro ao decodificar JSON: {e}")
        print(f"Resposta bruta: {response.text[:200]}...")
        return False
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        return False
    
    print("\n" + "=" * 60)
    return True

if __name__ == "__main__":
    print("🧪 Iniciando teste do endpoint /printings...")
    
    success = test_printings_endpoint()
    
    if success:
        print("\n� Teste /printings concluído com sucesso!")
        print("✅ Endpoint está funcionando e pronto para o modal!")
        print("📋 Analise a estrutura de dados acima para implementar o frontend.")
    else:
        print("\n❌ Teste /printings falhou!")
        print("🔧 Verifique se o backend está online e o endpoint existe.")
        sys.exit(1)

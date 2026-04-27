# 🧪 Tutorial - Phase 5.1: Parser Inteligente

## 🎯 Objetivo
Testar o novo parser que suporta formatos com `(SET)` e `#number` para encontrar cartas específicas.

## 📋 Passos para Testar

### 1. **Iniciar o Backend**
```bash
cd backend
python main.py
```
O servidor deve iniciar na porta 8000.

### 2. **Testar com Script Automático**
```bash
cd backend
python test_parser_v5.py
```

### 3. **Testar Manualmente no Frontend**

#### **Decklist de Teste - Copie e Cole:**
```
# Phase 5.1 - Parser Inteligente Test

# Formatos antigos (devem continuar funcionando)
4x Lightning Bolt
2 Island
1 Black Lotus

# NOVOS FORMATOS - Teste estes:
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

# Formatos misturados
4x Chain Lightning (EMA) 91
1 Volcanic Island (VMA) 280
```

### 4. **Acessar Frontend**
```bash
cd frontend
python serve.py
```
Abra: http://localhost:3000

### 5. **Colar o Decklist e Processar**
1. Cole o decklist acima no textarea
2. Clique "Processar Deck"
3. Verifique se todas as cartas aparecem com as artes corretas

## 🔍 **O Que Verificar**

### ✅ **Resultados Esperados:**
- **Total de cartas:** 24 cartas
- **Sem erros** de parsing
- **Artes específicas** para cada set:
  - `Demonic Tutor (UMA) 93` → Arte da Ultimate Masters
  - `Force of Will (EMA) 27` → Arte da Eternal Masters
  - `Tropical Island (VMA) 277` → Arte da Vintage Masters
  - `Lightning Bolt (LEA) 282` → Arte Alpha/Original

### ⚠️ **Se Alguma Carta Não Aparecer:**
1. Verifique o console do navegador (F12)
2. Confirme se o backend está online
3. Teste com o script `test_parser_v5.py`

## 🎮 **Testes Adicionais**

### **Teste 1: Apenas Formatos Antigos**
```
4x Lightning Bolt
1 Black Lotus
2 Island
Force of Will
```
*Deve funcionar como antes (8 cartas)*

### **Teste 2: Apenas Novos Formatos**
```
1x Demonic Tutor (UMA) 93
2 Force of Will (EMA) 27
4 Brainstorm (EMA) 43
```
*Deve encontrar as artes específicas (7 cartas)*

### **Teste 3: Mistura Completa**
```
4x Lightning Bolt           # Formato antigo
1x Demonic Tutor (UMA) 93   # Novo formato
2 Island                    # Formato antigo
1 Force of Will (EMA) 27    # Novo formato
```
*Deve processar todos corretamente (8 cartas)*

## 🐛 **Troubleshooting**

### **"API Offline"**
- Verifique se `python main.py` está rodando
- Confirme a porta 8000 está livre

### **"Carta não encontrada"**
- Alguns sets podem não estar no banco (ex: VMA)
- Use sets mais comuns como UMA, EMA, LEA

### **"Erro de parsing"**
- Verifique se o formato está correto: `(SET)` e `#number`
- Use códigos de set em maiúsculas: (UMA), (EMA)

## 📊 **Logs Esperados**

No terminal do backend, você deve ver:
```
✅ Encontrado específico: Demonic Tutor (UMA) #93
✅ Encontrado específico: Force of Will (EMA) #27
✅ Encontrado específico: Tropical Island (VMA) #277
```

## ✅ **Critérios de Sucesso**

- [ ] Script `test_parser_v5.py` passa em todos os testes
- [ ] Frontend processa decklist sem erros
- [ ] Todas as 24 cartas aparecem com artes corretas
- [ ] Formatos antigos continuam funcionando
- [ ] Logs mostram buscas específicas bem-sucedidas

## 🎉 **Próximo Passo**

Se todos os testes passarem, a **Phase 5.1** está completa e podemos avançar para **Phase 5.2: Correção Visual do Grid**!

---

**Dica:** Use o decklist completo acima para um teste abrangente de todos os formatos suportados.

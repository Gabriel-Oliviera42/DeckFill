#!/usr/bin/env python3
"""
Servidor de desenvolvimento simples para o frontend Deck Fill
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

# Configurações
PORT = 3000
DIRECTORY = "."
FRONTEND_DIR = Path(__file__).parent

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler para servir arquivos estáticos com CORS"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)
    
    def end_headers(self):
        # Adicionar headers CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        """Handle preflight requests"""
        self.send_response(200)
        self.end_headers()

def main():
    """Inicia o servidor de desenvolvimento"""
    
    # Mudar para o diretório do frontend
    os.chdir(FRONTEND_DIR)
    
    print("=" * 50)
    print("Deck Fill - Frontend Dev Server")
    print("=" * 50)
    print(f"📁 Diretório: {FRONTEND_DIR}")
    print(f"🚀 Servidor rodando em: http://localhost:{PORT}")
    print(f"🌐 Backend API: http://localhost:8000")
    print("=" * 50)
    print("Pressione Ctrl+C para parar")
    print()
    
    try:
        with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
            print(f"✅ Servidor iniciado na porta {PORT}")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Servidor interrompido pelo usuário")
        sys.exit(0)
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Porta {PORT} já está em uso!")
            print(f"Tente: 'lsof -ti:{PORT}' para ver quem está usando")
            sys.exit(1)
        else:
            print(f"❌ Erro ao iniciar servidor: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()

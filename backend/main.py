#!/usr/bin/env python3
"""
Deck Fill - Backend API
FastAPI server para processar decklists e buscar cartas no banco de dados local.
"""
import hashlib
import inspect
from io import BytesIO
import os

import requests
from fastapi.responses import Response
from urllib.parse import quote, urlparse

import json
import sqlite3
import re
import time
import contextlib
from typing import List, Dict, Any, Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from providers.registry import get_card_provider, normalize_game_key

try:
    from PIL import Image
except ImportError:  # pragma: no cover - fallback only for minimal envs
    Image = None

# Configurações
DB_FILE = "/data/cards.db"
PORT = 8000
IMAGE_CACHE_DIR = Path(__file__).resolve().parent / ".image-cache"
IMAGE_CACHE_TTL_SECONDS = int(os.getenv("DECKFILL_IMAGE_CACHE_TTL_SECONDS", "604800"))

# Modelos Pydantic
class CardResponse(BaseModel):
    id: str
    oracle_id: Optional[str] = None

    name: str
    printed_name: Optional[str] = None
    lang: str = "en"
    layout: Optional[str] = None

    set_code: str
    set_name: Optional[str] = None
    collector_number: str
    released_at: Optional[str] = None
    rarity: Optional[str] = None

    type_line: Optional[str] = None
    printed_type_line: Optional[str] = None
    oracle_text: Optional[str] = None
    printed_text: Optional[str] = None

    image_uri_normal: Optional[str] = None
    image_uri_png: Optional[str] = None
    image_uri_art_crop: Optional[str] = None

    image_uri_back_normal: Optional[str] = None
    image_uri_back_png: Optional[str] = None
    image_uri_back_art_crop: Optional[str] = None

    back_name: Optional[str] = None
    back_printed_name: Optional[str] = None
    back_type_line: Optional[str] = None
    back_oracle_text: Optional[str] = None
    back_printed_text: Optional[str] = None

    all_parts_json: Optional[str] = None
    card_faces_json: Optional[str] = None
    download_url: Optional[str] = None
    art_source: Optional[str] = None
    requested_language: Optional[str] = None
    resolved_language: Optional[str] = None
    language_fallback: bool = False
    has_relevant_secondary_face: bool = False
    is_related_token: bool = False
    is_auto_completed: bool = False
    auto_complete_category: Optional[str] = None
    parent_card_id: Optional[str] = None
    parent_card_name: Optional[str] = None

class DeckParseRequest(BaseModel):
    decklist: str
    game: str = "magic"
    preferred_language: str = "en"

class DeckParseResponse(BaseModel):
    cards: List[CardResponse]
    total_cards: int
    processing_time_ms: float
    errors: List[str]


def get_parsed_card_lookup_key(card: Dict[str, Any]) -> str:
    """Cria uma chave estavel para diferenciar reprints da mesma carta."""
    return "|".join([
        str(card.get("name") or "").strip().casefold(),
        str(card.get("set_code") or "").strip().casefold(),
        str(card.get("collector_number") or "").strip().casefold(),
    ])


def card_has_relevant_secondary_face(card_data: Dict[str, Any]) -> bool:
    """Indica se a carta tem verso/segunda face que pode precisar entrar no PDF."""
    layout = str(card_data.get("layout") or "").strip().lower()
    separate_face_layouts = {
        "transform",
        "modal_dfc",
        "double_faced_token",
        "meld",
        "reversible_card",
    }
    single_image_layouts = {
        "adventure",
        "split",
        "aftermath",
        "flip",
        "class",
        "case",
        "leveler",
    }
    has_back_image = bool(
        card_data.get("image_uri_back_normal") or card_data.get("image_uri_back_png")
    )

    if not has_back_image or layout in single_image_layouts:
        return False

    return not layout or layout in separate_face_layouts


def search_cards_with_optional_language(
    provider: Any,
    parsed_cards: List[Dict[str, Any]],
    preferred_language: str,
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Chama providers novos com idioma preferido sem quebrar providers antigos.

    A arquitetura atual dos providers aceita apenas parsed_cards. Magic passa a
    aceitar preferred_language, enquanto os demais continuam usando o contrato
    anterior ate terem suporte real de idioma.
    """
    signature = inspect.signature(provider.search_cards)
    accepts_kwargs = any(
        parameter.kind == inspect.Parameter.VAR_KEYWORD
        for parameter in signature.parameters.values()
    )

    if "preferred_language" in signature.parameters or accepts_kwargs:
        return provider.search_cards(
            parsed_cards,
            preferred_language=preferred_language,
        )

    return provider.search_cards(parsed_cards)

# Inicialização FastAPI
app = FastAPI(
    title="Deck Fill API",
    description="API para processar decklists de Magic: The Gathering",
    version="1.0.0"
)

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todas as origens para desenvolvimento
    allow_credentials=True,
    allow_methods=["*"],  # Permitir todos os métodos
    allow_headers=["*"],  # Permitir todos os headers
)

def get_db_connection() -> sqlite3.Connection:
    """Obtém uma conexão limpa com o banco de dados (Thread-Safe)."""
    if not Path(DB_FILE).exists():
        raise HTTPException(
            status_code=500,
            detail=f"Banco de dados '{DB_FILE}' não encontrado. Execute sync_db.py primeiro."
        )

    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row  # Para acessar colunas por nome
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

@app.get("/")
async def root():
    """Endpoint raiz para verificar se API está online."""
    return {
        "message": "Deck Fill API Online",
        "version": "1.0.0",
        "status": "operational"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        with contextlib.closing(get_db_connection()) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM cards")
            card_count = cursor.fetchone()[0]

            return {
                "status": "healthy",
                "database_connected": True,
                "total_cards": card_count,
                "timestamp": time.time()
            }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Health check failed: {str(e)}"
        )

def _image_cache_paths(url: str) -> tuple[Path, Path]:
    cache_key = hashlib.sha256(url.encode("utf-8")).hexdigest()
    return (
        IMAGE_CACHE_DIR / f"{cache_key}.bin",
        IMAGE_CACHE_DIR / f"{cache_key}.json",
    )


def _read_cached_image(url: str, allow_stale: bool = False) -> Optional[tuple[bytes, str, str]]:
    image_path, meta_path = _image_cache_paths(url)

    if not image_path.exists() or not meta_path.exists():
        return None

    try:
        metadata = json.loads(meta_path.read_text(encoding="utf-8"))
        cached_at = float(metadata.get("cached_at") or 0)
        is_fresh = (time.time() - cached_at) <= IMAGE_CACHE_TTL_SECONDS

        if not is_fresh and not allow_stale:
            return None

        cache_state = "HIT" if is_fresh else "STALE"
        return (
            image_path.read_bytes(),
            metadata.get("content_type") or "image/jpeg",
            cache_state,
        )
    except (OSError, ValueError, json.JSONDecodeError):
        return None


def _write_cached_image(url: str, content: bytes, content_type: str) -> None:
    image_path, meta_path = _image_cache_paths(url)
    IMAGE_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    image_path.write_bytes(content)
    meta_path.write_text(
        json.dumps(
            {
                "url": url,
                "content_type": content_type,
                "cached_at": time.time(),
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )


def _looks_like_image(content_type: str, content: bytes) -> bool:
    normalized_type = (content_type or "").split(";")[0].strip().lower()

    if normalized_type.startswith("image/"):
        return True

    return (
        content.startswith(b"\xff\xd8\xff")
        or content.startswith(b"\x89PNG\r\n\x1a\n")
        or content.startswith(b"RIFF")
        or content.startswith(b"GIF8")
    )


def _image_response(content: bytes, content_type: str, cache_state: str) -> Response:
    content, content_type = _normalize_proxy_image_content(content, content_type)

    return Response(
        content=content,
        media_type=content_type,
        headers={
            "Cache-Control": f"public, max-age={IMAGE_CACHE_TTL_SECONDS}",
            "Access-Control-Allow-Origin": "*",
            "Cross-Origin-Resource-Policy": "cross-origin",
            "X-DeckFill-Image-Cache": cache_state,
        },
    )


def _normalize_proxy_image_content(content: bytes, content_type: str) -> tuple[bytes, str]:
    normalized_type = (content_type or "").split(";")[0].strip().lower()

    if normalized_type not in {"image/avif", "image/webp"} or Image is None:
        return content, content_type

    try:
        with Image.open(BytesIO(content)) as image:
            canvas = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode in {"RGBA", "LA"}:
                canvas.paste(image, mask=image.convert("RGBA").getchannel("A"))
            else:
                canvas.paste(image.convert("RGB"))

            output = BytesIO()
            canvas.save(output, format="JPEG", quality=95)
            return output.getvalue(), "image/jpeg"
    except Exception:
        return content, content_type


def _proxied_image_url(request: Request, image_url: Optional[str]) -> Optional[str]:
    if not image_url or "/image-proxy?url=" in image_url:
        return image_url

    parsed = urlparse(image_url)
    if parsed.scheme not in {"http", "https"}:
        return image_url

    return f"{request.url_for('image_proxy')}?url={quote(image_url, safe='')}"


def _prepare_art_results_for_frontend(
    request: Request,
    results: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    prepared_results = []

    for result in results:
        prepared = dict(result)

        if prepared.get("art_source") == "mpc":
            for field in (
                "image_uri_normal",
                "image_uri_png",
                "image_uri_art_crop",
                "image_uri_back_normal",
                "image_uri_back_png",
                "image_uri_back_art_crop",
            ):
                original_url = prepared.get(field)
                if original_url:
                    prepared[f"original_{field}"] = original_url
                    prepared[field] = _proxied_image_url(request, original_url)

        prepared_results.append(prepared)

    return prepared_results

@app.get("/image-proxy")
def image_proxy(url: str):
    """
    Proxy simples para imagens externas usadas na geração de PDF.

    Necessário porque algumas APIs permitem exibir a imagem em <img>,
    mas bloqueiam fetch/canvas por CORS no navegador.
    """
    try:
        parsed = urlparse(url)

        image_host = (parsed.hostname or "").lower()
        allowed_hosts = {
            "images.ygoprodeck.com",
            "images.pokemontcg.io",
            "images.scrydex.com",
            "cards.scryfall.io",
            "cards.lorcast.io",
            "optcgapi.com",
            "en.onepiece-cardgame.com",
            "asia-en.onepiece-cardgame.com",
            "www.onepiece-cardgame.com",
            "onepiece-cardgame.com",
            "storage.googleapis.com",
            "dhhim4ltzu1pj.cloudfront.net",
            "d2wlb52bya4y8z.cloudfront.net",
            "legendstory-production-s3-public.s3.amazonaws.com",
            "fabtcg.com",
            "www.fabtcg.com",
            "i.postimg.cc",
            "upload.wikimedia.org",
            "drive.google.com",
            "drive.usercontent.google.com",
            "docs.google.com",
            "lh3.googleusercontent.com",
        }
        allowed_host_suffixes = (
            ".googleusercontent.com",
        )

        if parsed.scheme not in {"http", "https"}:
            raise HTTPException(status_code=400, detail="URL inválida.")

        if image_host not in allowed_hosts and not image_host.endswith(allowed_host_suffixes):
            raise HTTPException(
                status_code=400,
                detail=f"Host de imagem não permitido: {parsed.netloc}",
            )

        cached = _read_cached_image(url)
        if cached:
            content, content_type, cache_state = cached
            return _image_response(content, content_type, cache_state)

        response = requests.get(
            url,
            timeout=20,
            headers={
                "User-Agent": "DeckFill/1.0 (+https://localhost)",
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            },
            allow_redirects=True,
        )

        if response.status_code != 200:
            stale = _read_cached_image(url, allow_stale=True)
            if stale:
                content, content_type, cache_state = stale
                return _image_response(content, content_type, cache_state)

            raise HTTPException(
                status_code=response.status_code,
                detail="Não foi possível baixar a imagem.",
            )

        content_type = response.headers.get("content-type", "image/jpeg")
        content = response.content

        if not _looks_like_image(content_type, content):
            stale = _read_cached_image(url, allow_stale=True)
            if stale:
                content, content_type, cache_state = stale
                return _image_response(content, content_type, cache_state)

            raise HTTPException(
                status_code=502,
                detail="A URL retornou um conteudo que nao parece ser imagem.",
            )

        _write_cached_image(url, content, content_type)

        return _image_response(content, content_type, "MISS")

    except HTTPException:
        raise
    except Exception as e:
        stale = _read_cached_image(url, allow_stale=True)
        if stale:
            content, content_type, cache_state = stale
            return _image_response(content, content_type, cache_state)

        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar imagem: {str(e)}",
        )

@app.post("/parse-deck", response_model=DeckParseResponse)
async def parse_deck(request: DeckParseRequest):
    """
    Processa um decklist e retorna informações das cartas.

    Exemplo de decklist:
    ```
    4x Lightning Bolt
    1 Thantis, the Warweaver
    2 Island
    ```
    """
    start_time = time.time()

    game = normalize_game_key(request.game)
    provider = get_card_provider(game)
    preferred_language = (request.preferred_language or "en").lower().strip()

    try:
        # 1. Parse do decklist
        parsed_cards, parse_errors = provider.parse_decklist(request.decklist)

        # 2. Buscar cartas no banco (agora com informações de set/number)
        unique_parsed_cards = []
        seen_cards = set()

        for card in parsed_cards:
            lookup_key = get_parsed_card_lookup_key(card)
            card["lookup_key"] = lookup_key

            if lookup_key not in seen_cards:
                unique_parsed_cards.append(card)
                seen_cards.add(lookup_key)

        search_results = search_cards_with_optional_language(
            provider,
            unique_parsed_cards,
            preferred_language,
        )

        # 3. Montar resposta
        response_cards = []
        not_found = []

        for parsed_card in parsed_cards:
            card_name = parsed_card['name']
            quantity = parsed_card['quantity']
            lookup_key = parsed_card.get("lookup_key") or get_parsed_card_lookup_key(parsed_card)

            if lookup_key in search_results and search_results[lookup_key]:
                # Pega a primeira (melhor) correspondência
                # Converte sqlite3.Row para dict nativo antes de passar para CardResponse
                card_data = dict(search_results[lookup_key][0])
                resolved_language = (card_data.get("lang") or "en").lower().strip()
                language_fallback = (
                    bool(preferred_language)
                    and preferred_language != "en"
                    and resolved_language != preferred_language
                )

                # Adiciona a quantidade para cada cópia
                for _ in range(quantity):
                    front_card = dict(card_data)
                    front_card["requested_language"] = preferred_language
                    front_card["resolved_language"] = resolved_language
                    front_card["language_fallback"] = language_fallback
                    front_card["has_relevant_secondary_face"] = (
                        card_has_relevant_secondary_face(front_card)
                    )
                    response_cards.append(CardResponse(**front_card))
            else:
                not_found.append(f"{quantity}x {card_name}")

        # 4. Calcular tempo de processamento
        processing_time = (time.time() - start_time) * 1000  # ms

        # 5. Montar erros
        errors = parse_errors.copy()
        if not_found:
            errors.extend([f"Carta não encontrada: {card}" for card in not_found])

        return DeckParseResponse(
            cards=response_cards,
            total_cards=len(response_cards),
            processing_time_ms=round(processing_time, 2),
            errors=errors
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar decklist: {str(e)}"
        )

@app.get("/search/{card_name}")
async def search_card(card_name: str, limit: int = 10):
    """
    Busca uma carta específica pelo nome.

    Query params:
    - limit: número máximo de resultados (padrão: 10)
    """
    try:
        with contextlib.closing(get_db_connection()) as conn:
            cursor = conn.cursor()

            # Busca flexível
            search_name = f"%{card_name}%"
            cursor.execute(f"""
                SELECT {CARD_SELECT_COLUMNS}
                FROM cards
                WHERE name LIKE ?
                ORDER BY
                    CASE WHEN name LIKE ? THEN 1 ELSE 2 END,
                    name ASC,
                    set_code DESC,
                    collector_number ASC
                LIMIT ?
            """, (search_name, f"{card_name}%", limit))

            results = [dict(row) for row in cursor.fetchall()]

            return {
                "card": card_name,
                "results": results,
                "count": len(results)
            }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar carta: {str(e)}"
        )

@app.get("/art-sources")
async def get_art_sources(game: str = "magic"):
    """Lista fontes de arte disponiveis no modal."""
    game = normalize_game_key(game)
    provider = get_card_provider(game)
    sources = provider.get_art_sources()

    return {
        "game": game,
        "sources": sources,
    }


@app.get("/printings/{card_name:path}")
async def get_card_printings_multi_tcg(
    request: Request,
    card_name: str,
    game: str = "magic",
    source: str = "local",
    limit: int = 80,
):
    game = normalize_game_key(game)
    source = (source or "local").lower().strip()
    provider = get_card_provider(game)

    if not hasattr(provider, "search_printings"):
        raise HTTPException(
            status_code=400,
            detail=f"O jogo '{game}' ainda nao suporta troca de artes.",
        )

    results = provider.search_printings(
        card_name,
        source=source,
        limit=limit,
    )
    prepared_results = _prepare_art_results_for_frontend(request, results)

    return {
        "card": card_name,
        "game": game,
        "source": source,
        "count": len(prepared_results),
        "results": prepared_results,
    }


@app.get("/legacy/printings/{card_name:path}")
async def get_card_printings(card_name: str):
    """Compatibilidade: lista impressoes de Magic pelo nome."""
    provider = get_card_provider("magic")
    return provider.search_printings(card_name, source="scryfall", limit=500)


@app.get("/cards/{card_id}/printings")
async def get_card_printings_by_id_multi_tcg(
    request: Request,
    card_id: str,
    game: str = "magic",
    source: str = "local",
    name: Optional[str] = None,
    limit: int = 80,
):
    game = normalize_game_key(game)
    source = (source or "local").lower().strip()
    provider = get_card_provider(game)

    if not hasattr(provider, "get_printings_by_id"):
        raise HTTPException(
            status_code=400,
            detail=f"O jogo '{game}' ainda nao suporta troca de artes.",
        )

    result = provider.get_printings_by_id(
        card_id,
        source=source,
        name=name,
        limit=limit,
    )
    result["game"] = game
    result["source"] = result.get("source") or source

    if isinstance(result.get("results"), list):
        result["results"] = _prepare_art_results_for_frontend(
            request,
            result["results"],
        )
        result["count"] = len(result["results"])

    return result


@app.get("/legacy/cards/{card_id}/printings")
async def get_card_printings_by_id(card_id: str):
    """Compatibilidade: lista impressoes de Magic pelo ID Scryfall."""
    provider = get_card_provider("magic")
    return provider.get_printings_by_id(card_id, source="scryfall", limit=500)

@app.get("/cards/{card_id}/related")
async def get_card_related_parts(card_id: str):
    """
    Retorna as cartas completas listadas em all_parts_json.

    O Scryfall guarda tokens, partes de meld e combo pieces em all_parts,
    mas o objeto relacionado so traz metadados basicos. Este endpoint resolve
    os IDs contra o banco local para o frontend poder mostrar imagens.
    """
    try:
        with contextlib.closing(get_db_connection()) as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT all_parts_json
                FROM cards
                WHERE id = ?
                LIMIT 1
            """, (card_id,))

            row = cursor.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="Carta nao encontrada.")

            raw_parts = row["all_parts_json"]
            if not raw_parts:
                return {
                    "card_id": card_id,
                    "count": 0,
                    "parts": [],
                    "results": [],
                }

            try:
                parts = json.loads(raw_parts)
            except json.JSONDecodeError:
                parts = []

            related_ids = [
                part.get("id")
                for part in parts
                if isinstance(part, dict) and part.get("id")
            ]

            if not related_ids:
                return {
                    "card_id": card_id,
                    "count": 0,
                    "parts": parts,
                    "results": [],
                }

            placeholders = ",".join("?" for _ in related_ids)
            cursor.execute(f"""
                SELECT {CARD_SELECT_COLUMNS}
                FROM cards
                WHERE id IN ({placeholders})
            """, related_ids)

            cards_by_id = {row["id"]: dict(row) for row in cursor.fetchall()}
            results = []

            for part in parts:
                if not isinstance(part, dict):
                    continue

                part_id = part.get("id")
                related_card = cards_by_id.get(part_id)

                if related_card:
                    related_card["related_component"] = part.get("component")
                    related_card["related_uri"] = part.get("uri")
                    results.append(related_card)
                    continue

                results.append({
                    "id": part_id,
                    "name": part.get("name"),
                    "type_line": part.get("type_line"),
                    "related_component": part.get("component"),
                    "related_uri": part.get("uri"),
                })

            return {
                "card_id": card_id,
                "count": len(results),
                "parts": parts,
                "results": results,
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar partes relacionadas: {str(e)}"
        )

@app.get("/stats")
async def get_stats():
    """Retorna estatísticas do banco de dados."""
    try:
        with contextlib.closing(get_db_connection()) as conn:
            cursor = conn.cursor()

            # Estatísticas gerais
            cursor.execute("SELECT COUNT(*) FROM cards")
            total_cards = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(DISTINCT name) FROM cards")
            unique_names = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(DISTINCT set_code) FROM cards")
            unique_sets = cursor.fetchone()[0]

            # Sets mais comuns
            cursor.execute("""
                SELECT set_code, COUNT(*) as count
                FROM cards
                GROUP BY set_code
                ORDER BY count DESC
                LIMIT 10
            """)
            top_sets = [dict(row) for row in cursor.fetchall()]

            return {
                "total_cards": total_cards,
                "unique_names": unique_names,
                "unique_sets": unique_sets,
                "top_sets": top_sets
            }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao obter estatísticas: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn

    print("=" * 50)
    print("Deck Fill API Server")
    print("=" * 50)

    # Comentamos a trava para permitir que o servidor inicie vazio
    # e aguarde enviarmos o arquivo pelo terminal (SFTP)
    if not Path(DB_FILE).exists():
        print(f"Aviso: Banco '{DB_FILE}' ainda não encontrado. Aguardando upload...")
    else:
        print(f"Banco de dados encontrado: {DB_FILE}")

    print("Iniciando servidor na porta 8000")
    print("=" * 50)

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000, # Fixado na porta que o Fly.io espera
        reload=False, # Na nuvem (produção), o reload deve ficar False
        log_level="info"
    )
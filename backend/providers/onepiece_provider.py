"""One Piece Card Game provider using OPTCG API data."""

from __future__ import annotations

from functools import lru_cache
import json
import re
from typing import Any, Dict, Iterable, List, Optional, Tuple

import requests
from fastapi import HTTPException

from providers import local_tcg_db


ONEPIECE_API_ENDPOINTS = (
    "https://optcgapi.com/api/allSetCards/",
    "https://optcgapi.com/api/allSTCards/",
    "https://optcgapi.com/api/allPromoCards/",
    "https://optcgapi.com/api/allDonCards/",
)
ONEPIECE_DB_FILE = "onepiece_cards.db"
# Nao remova watermark por processamento de imagem. A solucao correta e trocar
# para uma fonte publica/licenciada melhor quando ela estiver estavel.
ONEPIECE_IMAGE_LIMITATION = (
    "As imagens públicas disponíveis para One Piece geralmente vêm das fontes "
    "oficiais/públicas da Bandai e podem conter watermark SAMPLE."
)

ONEPIECE_SECTION_HEADERS = {
    "deck",
    "main",
    "main deck",
    "leader",
    "leaders",
    "character",
    "characters",
    "event",
    "events",
    "stage",
    "stages",
    "don",
    "don!!",
    "don cards",
}


def _clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _slug(value: Any, fallback: str = "unknown") -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", str(value or "")).strip("-").lower()
    return slug or fallback


def derive_onepiece_set_code(card_code: Optional[str]) -> Optional[str]:
    if not card_code:
        return None

    normalized = str(card_code).strip().upper()

    match = re.match(r"^(OP|ST|EB|PRB)(\d{2})[- ]", normalized)
    if match:
        return f"{match.group(1)}-{match.group(2)}"

    if re.match(r"^P[- ]", normalized):
        return "P"

    if normalized.startswith("DON"):
        return "DON"

    if "-" in normalized:
        return normalized.split("-", 1)[0]

    return normalized


def get_lookup_key(parsed_card: Dict[str, Any]) -> str:
    return local_tcg_db.get_lookup_key(parsed_card)


def extract_onepiece_printing_hint(card_name: str) -> Tuple[str, Optional[str], Optional[str]]:
    card_name = re.sub(r"\s+", " ", card_name).strip()

    patterns = [
        re.compile(
            r"^(?P<name>.+?)\s*[\(\[]\s*(?P<code>(?:OP|ST|EB|PRB)\d{2}[- ]\d{3,4}[A-Za-z]?|P[- ]\d{3,4}[A-Za-z]?|DON[- ]?\d*)\s*[\)\]]\s*$",
            re.IGNORECASE,
        ),
        re.compile(
            r"^(?P<name>.+?)\s+(?P<code>(?:OP|ST|EB|PRB)\d{2}[- ]\d{3,4}[A-Za-z]?|P[- ]\d{3,4}[A-Za-z]?|DON[- ]?\d*)\s*$",
            re.IGNORECASE,
        ),
    ]

    for pattern in patterns:
        match = pattern.match(card_name)
        if match:
            code = match.group("code").replace(" ", "-").upper()
            return match.group("name").strip(), derive_onepiece_set_code(code), code

    return card_name, None, None


def parse_decklist(decklist: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    return local_tcg_db.parse_simple_decklist(
        decklist,
        section_headers=ONEPIECE_SECTION_HEADERS,
        extract_printing_hint=extract_onepiece_printing_hint,
    )


def _as_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [_clean_text(item) for item in value if _clean_text(item)]
    if isinstance(value, str):
        if not value.strip():
            return []
        return [
            _clean_text(item)
            for item in re.split(r"[,/|]+", value)
            if _clean_text(item)
        ]
    return [_clean_text(value)]


def _build_type_line(card: Dict[str, Any]) -> Optional[str]:
    color = "/".join(_as_list(card.get("card_color")))
    subtypes = "/".join(_as_list(card.get("sub_types") or card.get("subtypes")))

    parts = [
        card.get("card_type") or card.get("type"),
        color,
        subtypes,
        card.get("attribute"),
    ]
    compact = [_clean_text(part) for part in parts if _clean_text(part)]
    return " - ".join(compact) if compact else None


def _build_oracle_text(card: Dict[str, Any]) -> Optional[str]:
    text_parts: List[str] = []

    if card.get("card_text"):
        text_parts.append(str(card["card_text"]).strip())

    stats: List[str] = []
    for label, key in (
        ("Cost", "card_cost"),
        ("Life", "life"),
        ("Power", "card_power"),
        ("Counter", "counter_amount"),
    ):
        value = _clean_text(card.get(key))
        if value:
            stats.append(f"{label}: {value}")

    if stats:
        text_parts.append(" | ".join(stats))

    return "\n".join(text_parts) if text_parts else None


def normalize_onepiece_card(card: Dict[str, Any]) -> Dict[str, Any]:
    name = _clean_text(
        card.get("card_name")
        or card.get("name")
        or card.get("optcg_don_name")
        or "Unknown One Piece Card"
    )

    image_url = _clean_text(
        card.get("card_image")
        or card.get("image_url")
        or card.get("image")
    ) or None

    card_set_id = _clean_text(
        card.get("card_set_id")
        or card.get("card_image_id")
        or card.get("id")
    )
    set_code = _clean_text(card.get("set_id")) or derive_onepiece_set_code(card_set_id) or "OPCG"
    collector_number = card_set_id or _slug(name)

    card_image_id = _clean_text(card.get("card_image_id"))
    unique_id = card_image_id or collector_number or name

    return {
        "id": f"onepiece-{_slug(unique_id)}",
        "oracle_id": f"onepiece:{local_tcg_db.normalize_text(name)}",

        "name": name,
        "printed_name": None,
        "lang": "en",
        "layout": "normal",

        "set_code": str(set_code).upper(),
        "set_name": card.get("set_name") or "One Piece Card Game",
        "collector_number": str(collector_number),
        "released_at": card.get("release_date") or card.get("date_scraped"),
        "rarity": card.get("rarity"),

        "type_line": _build_type_line(card),
        "printed_type_line": None,
        "oracle_text": _build_oracle_text(card),
        "printed_text": None,

        "image_uri_normal": image_url,
        "image_uri_png": image_url,
        "image_uri_art_crop": image_url,

        "image_uri_back_normal": None,
        "image_uri_back_png": None,
        "image_uri_back_art_crop": None,

        "back_name": None,
        "back_printed_name": None,
        "back_type_line": None,
        "back_oracle_text": None,
        "back_printed_text": None,

        "all_parts_json": None,
        "card_faces_json": json.dumps([card], ensure_ascii=False),
    }


def get_set_aliases(card: Dict[str, Any]) -> List[Optional[str]]:
    card_set_id = _clean_text(card.get("card_set_id") or card.get("card_image_id"))
    return [
        card.get("set_id"),
        card.get("set_name"),
        derive_onepiece_set_code(card_set_id),
        card_set_id,
        card.get("rarity"),
        card.get("card_type"),
    ]


def _dedupe_cards(cards: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen: set[str] = set()
    deduped: List[Dict[str, Any]] = []

    for card in cards:
        key = "|".join([
            _clean_text(card.get("card_set_id") or card.get("card_image_id")),
            _clean_text(card.get("card_image")),
            _clean_text(card.get("card_name") or card.get("name")),
        ]).casefold()

        if key in seen:
            continue

        seen.add(key)
        deduped.append(card)

    return deduped


@lru_cache(maxsize=1)
def fetch_all_onepiece_cards() -> List[Dict[str, Any]]:
    cards: List[Dict[str, Any]] = []

    for endpoint in ONEPIECE_API_ENDPOINTS:
        response = requests.get(endpoint, timeout=60)
        if response.status_code == 404:
            continue

        response.raise_for_status()
        payload = response.json()

        if isinstance(payload, list):
            cards.extend(item for item in payload if isinstance(item, dict))
        elif isinstance(payload, dict):
            data = payload.get("data") or payload.get("cards") or []
            cards.extend(item for item in data if isinstance(item, dict))

    return _dedupe_cards(cards)


def _pick_onepiece_matches(card_name: str, limit: int = 10) -> List[Dict[str, Any]]:
    requested = local_tcg_db.normalize_text(card_name)
    cards = fetch_all_onepiece_cards()

    exact = [
        card
        for card in cards
        if local_tcg_db.normalize_text(card.get("card_name") or card.get("name")) == requested
    ]

    if exact:
        return exact[:limit]

    loose = [
        card
        for card in cards
        if requested in local_tcg_db.normalize_text(card.get("card_name") or card.get("name"))
    ]
    return loose[:limit]


def search_cards(parsed_cards: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    if local_tcg_db.database_exists(ONEPIECE_DB_FILE):
        return local_tcg_db.search_cards_in_db(
            ONEPIECE_DB_FILE,
            parsed_cards,
            "One Piece Card Game",
        )

    results: Dict[str, List[Dict[str, Any]]] = {}

    for parsed_card in parsed_cards:
        try:
            matches = _pick_onepiece_matches(parsed_card["name"])
            results[get_lookup_key(parsed_card)] = [
                normalize_onepiece_card(card) for card in matches
            ]
        except requests.RequestException as exc:
            print(f"Erro ao buscar One Piece card '{parsed_card['name']}': {exc}")
            results[get_lookup_key(parsed_card)] = []

    return results


def get_art_sources() -> List[Dict[str, Any]]:
    return [
        {
            "id": "local",
            "label": "OPTCG",
            "available": True,
            "is_default": True,
            "notice": ONEPIECE_IMAGE_LIMITATION,
        },
    ]


def ensure_local_source(source: Optional[str]) -> None:
    source = (source or "local").lower().strip()

    if source != "local":
        raise HTTPException(
            status_code=400,
            detail="One Piece Card Game usa apenas a fonte local neste fluxo.",
        )


def get_printings_by_id(
    card_id: str,
    *,
    source: str = "local",
    name: Optional[str] = None,
    limit: int = 80,
) -> Dict[str, Any]:
    ensure_local_source(source)
    return local_tcg_db.get_printings_by_id(
        ONEPIECE_DB_FILE,
        card_id,
        "One Piece Card Game",
        limit=limit,
    )


def get_printings_by_name(card_name: str, limit: int = 80) -> List[Dict[str, Any]]:
    return local_tcg_db.get_printings_by_name(
        ONEPIECE_DB_FILE,
        card_name,
        "One Piece Card Game",
        limit=limit,
    )


def search_printings(
    card_name: str,
    *,
    source: str = "local",
    limit: int = 80,
) -> List[Dict[str, Any]]:
    ensure_local_source(source)
    return get_printings_by_name(card_name, limit=limit)

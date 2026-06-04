"""Disney Lorcana provider using Lorcast data."""

from __future__ import annotations

from functools import lru_cache
import json
import re
from typing import Any, Dict, List, Optional, Tuple

import requests
from fastapi import HTTPException

from providers import local_tcg_db


LORCAST_API_BASE = "https://api.lorcast.com/v0"
LORCANA_DB_FILE = "lorcana_cards.db"

LORCANA_SECTION_HEADERS = {
    "deck",
    "main",
    "ink",
    "items",
    "actions",
    "songs",
    "characters",
    "locations",
}


def get_lookup_key(parsed_card: Dict[str, Any]) -> str:
    return local_tcg_db.get_lookup_key(parsed_card)


def build_lorcana_display_name(card: Dict[str, Any]) -> str:
    name = re.sub(r"\s+", " ", str(card.get("name") or "Unknown Lorcana Card")).strip()
    version = re.sub(r"\s+", " ", str(card.get("version") or "")).strip()

    if version and version.casefold() not in name.casefold():
        return f"{name} - {version}"

    return name


def extract_lorcana_printing_hint(card_name: str) -> Tuple[str, Optional[str], Optional[str]]:
    card_name = re.sub(r"\s+", " ", card_name).strip()

    patterns = [
        re.compile(
            r"^(?P<name>.+?)\s*[\(\[]\s*(?P<set>[A-Za-z0-9]{1,8})\s*(?:#|/|-)?\s*(?P<number>[A-Za-z0-9/-]+)\s*[\)\]]\s*$",
            re.IGNORECASE,
        ),
        re.compile(
            r"^(?P<name>.+?)\s*[\(\[]\s*(?P<set>[A-Za-z0-9]{1,8})\s*[\)\]]\s*#?\s*(?P<number>[A-Za-z0-9/-]+)\s*$",
            re.IGNORECASE,
        ),
    ]

    for pattern in patterns:
        match = pattern.match(card_name)
        if match:
            return (
                match.group("name").strip(),
                match.group("set").strip().upper(),
                match.group("number").strip(),
            )

    return card_name, None, None


def parse_decklist(decklist: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    return local_tcg_db.parse_simple_decklist(
        decklist,
        section_headers=LORCANA_SECTION_HEADERS,
        extract_printing_hint=extract_lorcana_printing_hint,
    )


def get_lorcana_images(card: Dict[str, Any]) -> Dict[str, Optional[str]]:
    image_uris = card.get("image_uris") or {}
    digital = image_uris.get("digital") or {}

    small = digital.get("small")
    normal = digital.get("normal") or digital.get("large") or small
    large = digital.get("large") or normal or small

    return {
        "small": small,
        "normal": normal,
        "large": large,
    }


def normalize_lorcana_card(card: Dict[str, Any]) -> Dict[str, Any]:
    card_id = str(card.get("id") or "")
    base_name = str(card.get("name") or "Unknown Lorcana Card").strip()
    display_name = build_lorcana_display_name(card)
    set_info = card.get("set") or {}
    images = get_lorcana_images(card)

    type_parts: List[str] = []
    if card.get("ink"):
        type_parts.append(str(card["ink"]))
    type_parts.extend(str(item) for item in card.get("type") or [])
    type_parts.extend(str(item) for item in card.get("classifications") or [])
    type_line = " - ".join(type_parts) if type_parts else None

    text_parts = []
    if card.get("text"):
        text_parts.append(str(card["text"]))
    if card.get("flavor_text"):
        text_parts.append(str(card["flavor_text"]))
    oracle_text = "\n\n".join(text_parts) if text_parts else None

    return {
        "id": f"lorcana-{card_id}",
        "oracle_id": f"lorcana:{local_tcg_db.normalize_text(base_name)}",

        "name": display_name,
        "printed_name": base_name,
        "lang": card.get("lang") or "en",
        "layout": card.get("layout") or "normal",

        "set_code": str(set_info.get("code") or "LOR").upper(),
        "set_name": set_info.get("name") or "Disney Lorcana",
        "collector_number": str(card.get("collector_number") or card_id or "unknown"),
        "released_at": card.get("released_at"),
        "rarity": card.get("rarity"),

        "type_line": type_line,
        "printed_type_line": None,
        "oracle_text": oracle_text,
        "printed_text": None,

        "image_uri_normal": images["normal"],
        "image_uri_png": images["large"] or images["normal"],
        "image_uri_art_crop": images["small"] or images["normal"],

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
    set_info = card.get("set") or {}
    return [
        set_info.get("id"),
        set_info.get("code"),
        set_info.get("name"),
        card.get("collector_number"),
        card.get("version"),
    ]


@lru_cache(maxsize=512)
def fetch_lorcast_cards_by_name(card_name: str) -> List[Dict[str, Any]]:
    try:
        response = requests.get(
            f"{LORCAST_API_BASE}/cards/search",
            params={"q": card_name, "unique": "prints"},
            timeout=20,
        )
        response.raise_for_status()
        payload = response.json()
        return payload.get("results") or []
    except requests.RequestException as exc:
        print(f"Erro ao buscar Lorcana card '{card_name}': {exc}")
        return []


def search_cards(parsed_cards: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    if local_tcg_db.database_exists(LORCANA_DB_FILE):
        return local_tcg_db.search_cards_in_db(
            LORCANA_DB_FILE,
            parsed_cards,
            "Disney Lorcana",
        )

    results: Dict[str, List[Dict[str, Any]]] = {}

    for parsed_card in parsed_cards:
        cards = fetch_lorcast_cards_by_name(parsed_card["name"])
        normalized_cards = [normalize_lorcana_card(card) for card in cards]
        results[get_lookup_key(parsed_card)] = normalized_cards[:10]

    return results


def get_art_sources() -> List[Dict[str, Any]]:
    return [
        {
            "id": "local",
            "label": "Lorcast",
            "available": True,
            "is_default": True,
        },
    ]


def ensure_local_source(source: Optional[str]) -> None:
    source = (source or "local").lower().strip()

    if source != "local":
        raise HTTPException(
            status_code=400,
            detail="Disney Lorcana usa apenas a fonte local neste fluxo.",
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
        LORCANA_DB_FILE,
        card_id,
        "Disney Lorcana",
        limit=limit,
    )


def get_printings_by_name(card_name: str, limit: int = 80) -> List[Dict[str, Any]]:
    return local_tcg_db.get_printings_by_name(
        LORCANA_DB_FILE,
        card_name,
        "Disney Lorcana",
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

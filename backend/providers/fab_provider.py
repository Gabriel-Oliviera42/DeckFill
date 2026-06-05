"""Flesh and Blood provider using GoAgain API data."""

from __future__ import annotations

from functools import lru_cache
import json
import re
from typing import Any, Dict, Iterable, List, Optional, Tuple

import requests
from fastapi import HTTPException

from providers import local_tcg_db


GOAGAIN_CARDS_API_URL = "https://api.goagain.dev/v1/cards"
FAB_DB_FILE = "fab_cards.db"

FAB_SECTION_HEADERS = {
    "deck",
    "main",
    "main deck",
    "hero",
    "heroes",
    "equipment",
    "weapons",
    "inventory",
    "sideboard",
}


def _clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _slug(value: Any, fallback: str = "unknown") -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", str(value or "")).strip("-").lower()
    return slug or fallback


def get_lookup_key(parsed_card: Dict[str, Any]) -> str:
    return local_tcg_db.get_lookup_key(parsed_card)


def derive_fab_set_code(printing_id: Optional[str]) -> Optional[str]:
    if not printing_id:
        return None

    normalized = str(printing_id).strip().upper()
    match = re.match(r"^(?P<set>[A-Z0-9]{2,8}?)(?P<number>\d{3}[A-Z]?)$", normalized)
    if match:
        return match.group("set")

    return None


def extract_fab_printing_hint(card_name: str) -> Tuple[str, Optional[str], Optional[str]]:
    card_name = re.sub(r"\s+", " ", card_name).strip()

    patterns = [
        re.compile(
            r"^(?P<name>.+?)\s*[\(\[]\s*(?P<set>[A-Z0-9]{2,8})\s*(?:#|/|-)?\s*(?P<code>[A-Z0-9]{2,8}\d{3}[A-Z]?)\s*[\)\]]\s*$",
            re.IGNORECASE,
        ),
        re.compile(
            r"^(?P<name>.+?)\s*[\(\[]\s*(?P<code>[A-Z0-9]{2,8}\d{3}[A-Z]?)\s*[\)\]]\s*$",
            re.IGNORECASE,
        ),
        re.compile(
            r"^(?P<name>.+?)\s+(?P<code>[A-Z0-9]{2,8}\d{3}[A-Z]?)\s*$",
            re.IGNORECASE,
        ),
    ]

    for pattern in patterns:
        match = pattern.match(card_name)
        if match:
            code = match.group("code").strip().upper()
            set_code = match.groupdict().get("set")
            return (
                match.group("name").strip(),
                set_code.strip().upper() if set_code else derive_fab_set_code(code),
                code,
            )

    return card_name, None, None


def parse_decklist(decklist: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    return local_tcg_db.parse_simple_decklist(
        decklist,
        section_headers=FAB_SECTION_HEADERS,
        extract_printing_hint=extract_fab_printing_hint,
    )


def _html_to_text(value: Optional[str]) -> Optional[str]:
    if not value:
        return None

    text = re.sub(r"<br\s*/?>", "\n", value, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _build_type_line(card: Dict[str, Any]) -> Optional[str]:
    if card.get("type_text"):
        return _clean_text(card["type_text"])

    types = card.get("types") or []
    if isinstance(types, list) and types:
        return " - ".join(_clean_text(item) for item in types if _clean_text(item))

    return None


def _build_oracle_text(
    card: Dict[str, Any],
    printing: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    text_parts: List[str] = []

    plain_text = _clean_text(card.get("functional_text_plain"))
    html_text = _html_to_text(card.get("functional_text"))

    if plain_text:
        text_parts.append(plain_text)
    elif html_text:
        text_parts.append(html_text)

    flavor = _clean_text((printing or {}).get("flavor_text"))
    if flavor:
        text_parts.append(flavor)

    stats: List[str] = []
    for label, key in (
        ("Pitch", "pitch"),
        ("Cost", "cost"),
        ("Power", "power"),
        ("Defense", "defense"),
        ("Life", "life"),
        ("Intellect", "intellect"),
    ):
        value = _clean_text(card.get(key))
        if value:
            stats.append(f"{label}: {value}")

    if stats:
        text_parts.append(" | ".join(stats))

    return "\n\n".join(text_parts) if text_parts else None


def normalize_fab_card(
    card: Dict[str, Any],
    printing: Optional[Dict[str, Any]] = None,
    *,
    set_names: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    printing = printing or {}
    set_names = set_names or {}

    name = _clean_text(card.get("name") or "Unknown Flesh and Blood Card")
    card_unique_id = _clean_text(card.get("unique_id")) or local_tcg_db.normalize_text(name)
    printing_unique_id = _clean_text(printing.get("unique_id")) or _clean_text(printing.get("id")) or card_unique_id
    printing_id = _clean_text(printing.get("id")) or printing_unique_id
    set_code = _clean_text(printing.get("set_id")) or derive_fab_set_code(printing_id) or "FAB"

    image_url = _clean_text(printing.get("image_url")) or None

    artists = printing.get("artists") or []
    if isinstance(artists, list):
        artist_text = ", ".join(_clean_text(item) for item in artists if _clean_text(item))
    else:
        artist_text = _clean_text(artists)

    rarity = _clean_text(printing.get("rarity")) or None
    if artist_text and rarity:
        rarity = f"{rarity} - {artist_text}"
    elif artist_text:
        rarity = artist_text

    return {
        "id": f"fab-{_slug(printing_unique_id)}",
        "oracle_id": f"fab:{card_unique_id}",

        "name": name,
        "printed_name": None,
        "lang": "en",
        "layout": "normal",

        "set_code": str(set_code).upper(),
        "set_name": set_names.get(str(set_code).upper()) or set_names.get(str(set_code)) or "Flesh and Blood",
        "collector_number": str(printing_id or card_unique_id),
        "released_at": printing.get("release_date") or printing.get("date"),
        "rarity": rarity,

        "type_line": _build_type_line(card),
        "printed_type_line": None,
        "oracle_text": _build_oracle_text(card, printing),
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
        "card_faces_json": json.dumps(
            [{"card": card, "printing": printing}],
            ensure_ascii=False,
        ),
    }


def iter_fab_printing_cards(
    card: Dict[str, Any],
    *,
    set_names: Optional[Dict[str, str]] = None,
) -> Iterable[Dict[str, Any]]:
    printings = card.get("printings") or []

    if not printings:
        yield normalize_fab_card(card, set_names=set_names)
        return

    for printing in printings:
        if not isinstance(printing, dict):
            continue
        yield normalize_fab_card(card, printing, set_names=set_names)


def get_set_aliases(
    card: Dict[str, Any],
    printing: Optional[Dict[str, Any]] = None,
) -> List[Optional[str]]:
    printing = printing or {}
    printing_id = _clean_text(printing.get("id"))
    return [
        card.get("unique_id"),
        card.get("name"),
        printing.get("unique_id"),
        printing_id,
        printing.get("set_id"),
        derive_fab_set_code(printing_id),
        printing.get("edition"),
        printing.get("rarity"),
    ]


@lru_cache(maxsize=512)
def fetch_fab_cards_by_name(card_name: str) -> List[Dict[str, Any]]:
    response = requests.get(
        GOAGAIN_CARDS_API_URL,
        params={"name": card_name, "limit": 20},
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    data = payload.get("data") if isinstance(payload, dict) else []
    return data or []


def search_cards(parsed_cards: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    if local_tcg_db.database_exists(FAB_DB_FILE):
        return local_tcg_db.search_cards_in_db(
            FAB_DB_FILE,
            parsed_cards,
            "Flesh and Blood",
        )

    results: Dict[str, List[Dict[str, Any]]] = {}

    for parsed_card in parsed_cards:
        try:
            raw_cards = fetch_fab_cards_by_name(parsed_card["name"])
            normalized: List[Dict[str, Any]] = []

            for raw_card in raw_cards:
                normalized.extend(iter_fab_printing_cards(raw_card))

            results[get_lookup_key(parsed_card)] = normalized[:10]
        except requests.RequestException as exc:
            print(f"Erro ao buscar FAB card '{parsed_card['name']}': {exc}")
            results[get_lookup_key(parsed_card)] = []

    return results


def get_art_sources() -> List[Dict[str, Any]]:
    return [
        {
            "id": "local",
            "label": "GoAgain",
            "available": True,
            "is_default": True,
        },
    ]


def ensure_local_source(source: Optional[str]) -> None:
    source = (source or "local").lower().strip()

    if source != "local":
        raise HTTPException(
            status_code=400,
            detail="Flesh and Blood usa apenas a fonte local neste fluxo.",
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
        FAB_DB_FILE,
        card_id,
        "Flesh and Blood",
        limit=limit,
    )


def get_printings_by_name(card_name: str, limit: int = 80) -> List[Dict[str, Any]]:
    return local_tcg_db.get_printings_by_name(
        FAB_DB_FILE,
        card_name,
        "Flesh and Blood",
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

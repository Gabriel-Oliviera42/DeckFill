"""Yu-Gi-Oh! provider."""

from __future__ import annotations

from functools import lru_cache
import json
import re
from typing import Any, Dict, List, Optional, Tuple

import requests
from fastapi import HTTPException

from providers import local_tcg_db


YGOPRODECK_API_URL = "https://db.ygoprodeck.com/api/v7/cardinfo.php"
YUGIOH_DB_FILE = "yugioh_cards.db"

YUGIOH_SECTION_HEADERS = {
    "main",
    "main deck",
    "extra",
    "extra deck",
    "side",
    "side deck",
}


def get_lookup_key(parsed_card: Dict[str, Any]) -> str:
    return parsed_card.get("lookup_key") or "|".join([
        str(parsed_card.get("name") or "").strip().casefold(),
        str(parsed_card.get("set_code") or "").strip().casefold(),
        str(parsed_card.get("collector_number") or "").strip().casefold(),
    ])


def normalize_yugioh_line(line: str) -> str:
    return line.strip().lstrip("#!").strip().strip(":").casefold()


def should_ignore_yugioh_line(line: str) -> bool:
    return normalize_yugioh_line(line) in YUGIOH_SECTION_HEADERS


def extract_yugioh_printing_hint(card_name: str) -> Tuple[str, Optional[str], Optional[str]]:
    card_name = re.sub(r"\s+", " ", card_name).strip()

    patterns = [
        re.compile(
            r"^(?P<name>.+?)\s*[\(\[]\s*(?P<set>[A-Za-z0-9]{2,10}-[A-Za-z0-9]{1,10})\s*[\)\]]\s*$",
            re.IGNORECASE,
        ),
        re.compile(
            r"^(?P<name>.+?)\s+(?P<set>[A-Za-z0-9]{2,10}-[A-Za-z0-9]{1,10})\s*$",
            re.IGNORECASE,
        ),
    ]

    for pattern in patterns:
        match = pattern.match(card_name)
        if match:
            set_code = match.group("set").strip().upper()
            return match.group("name").strip(), set_code, set_code

    return card_name, None, None


def parse_decklist(decklist: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parse de decklist Yu-Gi-Oh!.

    Suporta:
    - "3 Blue-Eyes White Dragon"
    - "1x Dark Magician"
    - "89631139" em listas YDK
    - "1 Blue-Eyes White Dragon LOB-001"
    """
    cards: List[Dict[str, Any]] = []
    errors: List[str] = []

    patterns = [
        r"^\s*(\d+)\s*[xX]?\s+(.+?)\s*$",
        r"^\s*(.+?)\s*$",
    ]

    for line_num, raw_line in enumerate(decklist.strip().split("\n"), 1):
        line = raw_line.strip().rstrip(".")

        if not line or line.startswith("//") or should_ignore_yugioh_line(line):
            continue

        card_found = False

        for pattern in patterns:
            match = re.match(pattern, line, re.IGNORECASE)
            if not match:
                continue

            groups = match.groups()

            try:
                if len(groups) == 2:
                    quantity = int(groups[0])
                    card_name = groups[1].strip()
                else:
                    quantity = 1
                    card_name = groups[0].strip()

                card_name, set_code, collector_number = extract_yugioh_printing_hint(card_name)

                if quantity > 0 and card_name:
                    cards.append({
                        "quantity": quantity,
                        "name": card_name,
                        "set_code": set_code,
                        "collector_number": collector_number,
                        "line_number": line_num,
                    })
                    card_found = True
                    break

            except ValueError:
                errors.append(f"Linha {line_num}: Erro ao processar quantidade - {line}")
                break

        if not card_found:
            errors.append(f"Linha {line_num}: Formato nao reconhecido - {line}")

    return cards, errors


@lru_cache(maxsize=512)
def fetch_yugioh_card_by_name(card_name: str) -> Optional[Dict[str, Any]]:
    """
    Fallback externo para desenvolvimento quando yugioh_cards.db ainda nao existe.
    """
    try:
        if card_name.isdigit():
            id_response = requests.get(
                YGOPRODECK_API_URL,
                params={"id": card_name},
                timeout=15,
            )

            if id_response.status_code == 200:
                cards = id_response.json().get("data", [])
                if cards:
                    return cards[0]

        exact_response = requests.get(
            YGOPRODECK_API_URL,
            params={"name": card_name},
            timeout=15,
        )

        if exact_response.status_code == 200:
            cards = exact_response.json().get("data", [])
            if cards:
                return cards[0]

        fuzzy_response = requests.get(
            YGOPRODECK_API_URL,
            params={"fname": card_name},
            timeout=15,
        )

        if fuzzy_response.status_code == 200:
            cards = fuzzy_response.json().get("data", [])
            if cards:
                return cards[0]

        return None

    except requests.RequestException as exc:
        print(f"Erro ao buscar Yu-Gi-Oh card '{card_name}': {exc}")
        return None


def _first_set(card: Dict[str, Any]) -> Dict[str, Any]:
    sets = card.get("card_sets") or []
    return sets[0] if sets else {}


def _build_type_line(card: Dict[str, Any]) -> Optional[str]:
    parts = [
        card.get("type"),
        card.get("race"),
        card.get("attribute"),
    ]
    return " - ".join(str(part) for part in parts if part)


def normalize_yugioh_card(
    card: Dict[str, Any],
    image: Optional[Dict[str, Any]] = None,
    card_set: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    card_id = str(card.get("id") or "")
    name = card.get("name") or "Unknown Yu-Gi-Oh Card"

    images = card.get("card_images") or []
    selected_image = image or (images[0] if images else {})
    image_id = str(selected_image.get("id") or card_id)

    image_url = selected_image.get("image_url")
    image_url_small = selected_image.get("image_url_small") or image_url
    image_url_cropped = selected_image.get("image_url_cropped")

    first_set = card_set or _first_set(card)
    set_code = first_set.get("set_code") or "YGO"
    set_code_id = re.sub(r"[^a-zA-Z0-9]+", "-", str(set_code)).strip("-").lower()

    description = card.get("desc")

    return {
        "id": f"yugioh-{card_id}-{set_code_id}-{image_id}",
        "oracle_id": f"yugioh:{card_id}",

        "name": name,
        "printed_name": None,
        "lang": "en",
        "layout": "normal",

        "set_code": str(set_code).upper(),
        "set_name": first_set.get("set_name") or "Yu-Gi-Oh!",
        "collector_number": str(set_code).upper() if card_set else image_id or card_id or "unknown",
        "released_at": None,
        "rarity": first_set.get("set_rarity"),

        "type_line": _build_type_line(card),
        "printed_type_line": None,
        "oracle_text": description,
        "printed_text": None,

        "image_uri_normal": image_url,
        "image_uri_png": image_url,
        "image_uri_art_crop": image_url_cropped or image_url_small,

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
    aliases: List[Optional[str]] = [
        str(card.get("id")) if card.get("id") else None,
        card.get("archetype"),
    ]

    for card_set in card.get("card_sets") or []:
        aliases.extend([
            card_set.get("set_code"),
            card_set.get("set_name"),
            card_set.get("set_rarity"),
        ])

    return aliases


def search_cards(parsed_cards: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    if local_tcg_db.database_exists(YUGIOH_DB_FILE):
        return local_tcg_db.search_cards_in_db(
            YUGIOH_DB_FILE,
            parsed_cards,
            "Yu-Gi-Oh!",
        )

    results: Dict[str, List[Dict[str, Any]]] = {}

    for parsed_card in parsed_cards:
        card_name = parsed_card["name"]
        found_card = fetch_yugioh_card_by_name(card_name)

        if found_card:
            results[get_lookup_key(parsed_card)] = [normalize_yugioh_card(found_card)]
        else:
            results[get_lookup_key(parsed_card)] = []

    return results


def get_art_sources() -> List[Dict[str, Any]]:
    return [
        {
            "id": "local",
            "label": "YGOPRODeck",
            "available": True,
            "is_default": True,
        },
    ]


def ensure_local_source(source: Optional[str]) -> None:
    source = (source or "local").lower().strip()

    if source != "local":
        raise HTTPException(
            status_code=400,
            detail="Yu-Gi-Oh! usa apenas a fonte local neste fluxo.",
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
        YUGIOH_DB_FILE,
        card_id,
        "Yu-Gi-Oh!",
        limit=limit,
    )


def get_printings_by_name(card_name: str, limit: int = 80) -> List[Dict[str, Any]]:
    return local_tcg_db.get_printings_by_name(
        YUGIOH_DB_FILE,
        card_name,
        "Yu-Gi-Oh!",
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

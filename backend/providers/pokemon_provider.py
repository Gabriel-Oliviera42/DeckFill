"""Pokemon provider."""

from __future__ import annotations

from functools import lru_cache
import json
import re
from typing import Any, Dict, List, Optional, Tuple

import requests
from fastapi import HTTPException

from providers import local_tcg_db


POKEMON_TCG_API_URL = "https://api.pokemontcg.io/v2/cards"
POKEMON_DB_FILE = "pokemon_cards.db"

POKEMON_SECTION_HEADERS = {
    "pokemon",
    "pokémon",
    "pok?mon",
    "trainer",
    "trainers",
    "trainer cards",
    "energy",
    "energies",
    "energy cards",
}

POKEMON_SET_CODE_ALIASES = {
    "SSH": "SWSH1",
    "RCL": "SWSH2",
    "DAA": "SWSH3",
    "CPA": "SWSH35",
    "VIV": "SWSH4",
    "SHF": "SWSH45",
    "BST": "SWSH5",
    "CRE": "SWSH6",
    "EVS": "SWSH7",
    "CEL": "CEL25",
    "FST": "SWSH8",
    "BRS": "SWSH9",
    "ASR": "SWSH10",
    "PGO": "PGO",
    "LOR": "SWSH11",
    "SIT": "SWSH12",
    "CRZ": "SWSH12PT5",
    "SVI": "SV1",
    "PAL": "SV2",
    "OBF": "SV3",
    "MEW": "SV3PT5",
    "PAR": "SV4",
    "PAF": "SV4PT5",
    "TEF": "SV5",
    "TWM": "SV6",
    "SFA": "SV6PT5",
    "SCR": "SV7",
    "SSP": "SV8",
    "PRE": "SV8PT5",
    "JTG": "SV9",
    "DRI": "SV10",
}


def normalize_pokemon_set_hint(set_code: Optional[str]) -> Optional[str]:
    if not set_code:
        return None

    normalized = set_code.strip().upper()
    return POKEMON_SET_CODE_ALIASES.get(normalized, normalized)


def get_lookup_key(parsed_card: Dict[str, Any]) -> str:
    return parsed_card.get("lookup_key") or "|".join([
        str(parsed_card.get("name") or "").strip().casefold(),
        str(parsed_card.get("set_code") or "").strip().casefold(),
        str(parsed_card.get("collector_number") or "").strip().casefold(),
    ])


def should_ignore_pokemon_line(line: str) -> bool:
    normalized = line.strip().strip(":").casefold()
    return normalized in POKEMON_SECTION_HEADERS


def extract_pokemon_printing_hint(card_name: str) -> Tuple[str, Optional[str], Optional[str]]:
    card_name = re.sub(r"\s+", " ", card_name).strip()

    patterns = [
        re.compile(
            r"^(?P<name>.+?)\s*[\(\[]\s*(?P<set>[A-Za-z0-9]{2,10})\s*(?:#|/|-)?\s*(?P<number>[A-Za-z0-9/-]+)\s*[\)\]]\s*$",
            re.IGNORECASE,
        ),
        re.compile(
            r"^(?P<name>.+?)\s*[\(\[]\s*(?P<set>[A-Za-z0-9]{2,10})\s*[\)\]]\s*#?\s*(?P<number>[A-Za-z0-9/-]+)\s*$",
            re.IGNORECASE,
        ),
        re.compile(
            r"^(?P<name>.+?)\s+(?P<set>[A-Z0-9]{2,10})\s+#?(?P<number>[A-Za-z0-9/-]+)\s*$",
        ),
    ]

    for pattern in patterns:
        match = pattern.match(card_name)
        if match:
            return (
                match.group("name").strip(),
                normalize_pokemon_set_hint(match.group("set")),
                match.group("number").strip(),
            )

    return card_name, None, None


def parse_decklist(decklist: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parse de decklist Pokemon.

    Suporta:
    - "4 Pikachu"
    - "1x Charizard ex"
    - "1 Buddy-Buddy Poffin TEF 144"
    - "1 Charizard ex (PAF #54)"
    """
    cards: List[Dict[str, Any]] = []
    errors: List[str] = []

    patterns = [
        r"^\s*(\d+)\s*[xX]?\s+(.+?)\s*$",
        r"^\s*(.+?)\s*$",
    ]

    for line_num, raw_line in enumerate(decklist.strip().split("\n"), 1):
        line = raw_line.strip().rstrip(".")

        if not line or line.startswith("//") or line.startswith("#") or should_ignore_pokemon_line(line):
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

                card_name, set_code, collector_number = extract_pokemon_printing_hint(card_name)

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


def escape_pokemon_query_value(value: str) -> str:
    return value.replace('"', '\\"')


def pick_best_pokemon_match(
    cards: List[Dict[str, Any]],
    requested_name: str,
) -> Optional[Dict[str, Any]]:
    if not cards:
        return None

    normalized_requested = requested_name.casefold().strip()

    exact_matches = [
        card for card in cards
        if (card.get("name") or "").casefold().strip() == normalized_requested
    ]

    if exact_matches:
        return exact_matches[0]

    starts_with_matches = [
        card for card in cards
        if (card.get("name") or "").casefold().strip().startswith(normalized_requested)
    ]

    if starts_with_matches:
        return starts_with_matches[0]

    return cards[0]


@lru_cache(maxsize=512)
def fetch_pokemon_card_by_name(card_name: str) -> Optional[Dict[str, Any]]:
    """
    Fallback externo para desenvolvimento quando pokemon_cards.db ainda nao existe.
    """
    try:
        safe_name = escape_pokemon_query_value(card_name)

        exact_response = requests.get(
            POKEMON_TCG_API_URL,
            params={
                "q": f'name:"{safe_name}"',
                "pageSize": 100,
                "orderBy": "name,-set.releaseDate",
            },
            timeout=15,
        )

        if exact_response.status_code == 200:
            cards = exact_response.json().get("data", [])
            best_match = pick_best_pokemon_match(cards, card_name)

            if best_match:
                return best_match

        fuzzy_response = requests.get(
            POKEMON_TCG_API_URL,
            params={
                "q": f'name:{safe_name}*',
                "pageSize": 100,
                "orderBy": "name,-set.releaseDate",
            },
            timeout=15,
        )

        if fuzzy_response.status_code == 200:
            cards = fuzzy_response.json().get("data", [])
            best_match = pick_best_pokemon_match(cards, card_name)

            if best_match:
                return best_match

        return None

    except requests.RequestException as exc:
        print(f"Erro ao buscar Pokemon card '{card_name}': {exc}")
        return None


def normalize_pokemon_card(card: Dict[str, Any]) -> Dict[str, Any]:
    card_id = str(card.get("id") or "")
    name = card.get("name") or "Unknown Pokemon Card"

    images = card.get("images") or {}
    set_info = card.get("set") or {}

    image_small = images.get("small")
    image_large = images.get("large") or image_small
    set_code = set_info.get("ptcgoCode") or set_info.get("id") or "PKM"

    supertype = card.get("supertype")
    subtypes = card.get("subtypes") or []
    types = card.get("types") or []

    type_parts: List[str] = []
    if supertype:
        type_parts.append(supertype)
    if subtypes:
        type_parts.append(" ".join(subtypes))
    if types:
        type_parts.append(f"({'/'.join(types)})")

    type_line = " - ".join(type_parts) if type_parts else None

    text_parts: List[str] = []

    if card.get("flavorText"):
        text_parts.append(card["flavorText"])

    for rule in card.get("rules") or []:
        text_parts.append(rule)

    for ability in card.get("abilities") or []:
        ability_name = ability.get("name") or "Ability"
        ability_text = ability.get("text")
        ability_type = ability.get("type")
        ability_line = ability_name

        if ability_type:
            ability_line += f" ({ability_type})"
        if ability_text:
            ability_line += f": {ability_text}"

        text_parts.append(ability_line)

    for attack in card.get("attacks") or []:
        attack_name = attack.get("name") or "Attack"
        attack_text = attack.get("text")
        attack_damage = attack.get("damage")
        attack_line = attack_name

        if attack_damage:
            attack_line += f" ({attack_damage})"
        if attack_text:
            attack_line += f": {attack_text}"

        text_parts.append(attack_line)

    oracle_text = "\n".join(text_parts) if text_parts else None

    return {
        "id": f"pokemon-{card_id}",
        "oracle_id": f"pokemon:{local_tcg_db.normalize_text(name)}",

        "name": name,
        "printed_name": None,
        "lang": "en",
        "layout": "normal",

        "set_code": str(set_code).upper(),
        "set_name": set_info.get("name") or "Pokemon TCG",
        "collector_number": str(card.get("number") or card_id or "unknown"),
        "released_at": set_info.get("releaseDate"),
        "rarity": card.get("rarity"),

        "type_line": type_line,
        "printed_type_line": None,
        "oracle_text": oracle_text,
        "printed_text": None,

        "image_uri_normal": image_large,
        "image_uri_png": image_large,
        "image_uri_art_crop": image_small or image_large,

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
        set_info.get("ptcgoCode"),
        set_info.get("name"),
        set_info.get("series"),
    ]


def search_cards(parsed_cards: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    if local_tcg_db.database_exists(POKEMON_DB_FILE):
        return local_tcg_db.search_cards_in_db(
            POKEMON_DB_FILE,
            parsed_cards,
            "Pokemon",
        )

    results: Dict[str, List[Dict[str, Any]]] = {}

    for parsed_card in parsed_cards:
        card_name = parsed_card["name"]
        found_card = fetch_pokemon_card_by_name(card_name)

        if found_card:
            results[get_lookup_key(parsed_card)] = [normalize_pokemon_card(found_card)]
        else:
            results[get_lookup_key(parsed_card)] = []

    return results


def get_art_sources() -> List[Dict[str, Any]]:
    return [
        {
            "id": "local",
            "label": "Pokemon TCG",
            "available": True,
            "is_default": True,
        },
    ]


def ensure_local_source(source: Optional[str]) -> None:
    source = (source or "local").lower().strip()

    if source != "local":
        raise HTTPException(
            status_code=400,
            detail="Pokemon TCG usa apenas a fonte local neste fluxo.",
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
        POKEMON_DB_FILE,
        card_id,
        "Pokemon",
        limit=limit,
    )


def get_printings_by_name(card_name: str, limit: int = 80) -> List[Dict[str, Any]]:
    return local_tcg_db.get_printings_by_name(
        POKEMON_DB_FILE,
        card_name,
        "Pokemon",
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

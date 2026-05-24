"""
Pokémon Provider

Primeira versão básica:
- parseia decklists simples
- busca cartas na Pokémon TCG API v2
- normaliza a resposta para o formato atual do DeckFill

Observação:
Esta versão ainda não usa cache local. Para produção, o ideal é criar cache/DB
ou aceitar uma API key para melhorar limites.
"""

import re
from typing import Any, Dict, List, Optional, Tuple

import requests


POKEMON_TCG_API_URL = "https://api.pokemontcg.io/v2/cards"


def parse_decklist(decklist: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parse simples de decklist de Pokémon.

    Suporta:
    - "4 Pikachu"
    - "1x Charizard"
    - "Professor's Research"
    """
    cards = []
    errors = []

    patterns = [
        r"^\s*(\d+)\s*[xX]?\s+(.+?)\s*$",
        r"^\s*(.+?)\s*$",
    ]

    lines = decklist.strip().split("\n")

    for line_num, line in enumerate(lines, 1):
        line = line.strip().rstrip(".")

        if not line or line.startswith("//") or line.startswith("#"):
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

                card_name = re.sub(r"\s+", " ", card_name).strip()

                if quantity > 0 and card_name:
                    cards.append({
                        "quantity": quantity,
                        "name": card_name,
                        "line_number": line_num,
                    })
                    card_found = True
                    break

            except ValueError:
                errors.append(f"Linha {line_num}: Erro ao processar quantidade - {line}")
                break

        if not card_found:
            errors.append(f"Linha {line_num}: Formato não reconhecido - {line}")

    return cards, errors


def escape_pokemon_query_value(value: str) -> str:
    """
    Escapa aspas para uso básico no parâmetro q da Pokémon TCG API.
    """
    return value.replace('"', '\\"')


def pick_best_pokemon_match(
    cards: List[Dict[str, Any]],
    requested_name: str,
) -> Optional[Dict[str, Any]]:
    """
    Escolhe o melhor resultado para uma busca de Pokémon.

    Preferência:
    1. Nome exatamente igual ao digitado.
    2. Nome começa com o digitado.
    3. Primeiro resultado retornado pela API.
    """
    if not cards:
        return None

    normalized_requested = requested_name.lower().strip()

    exact_matches = [
        card for card in cards
        if (card.get("name") or "").lower().strip() == normalized_requested
    ]

    if exact_matches:
        return exact_matches[0]

    starts_with_matches = [
        card for card in cards
        if (card.get("name") or "").lower().strip().startswith(normalized_requested)
    ]

    if starts_with_matches:
        return starts_with_matches[0]

    return cards[0]

def fetch_pokemon_card_by_name(card_name: str) -> Optional[Dict[str, Any]]:
    """
    Busca carta por nome na Pokémon TCG API.

    Primeiro tenta nome exato.
    Se não achar, tenta busca aproximada por wildcard.
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
            data = exact_response.json()
            cards = data.get("data", [])
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
            data = fuzzy_response.json()
            cards = data.get("data", [])
            best_match = pick_best_pokemon_match(cards, card_name)

            if best_match:
                return best_match

        return None

    except requests.RequestException as exc:
        print(f"Erro ao buscar Pokémon card '{card_name}': {exc}")
        return None


def normalize_pokemon_card(card: Dict[str, Any]) -> Dict[str, Any]:
    """
    Converte uma carta da Pokémon TCG API para o formato CardResponse atual.
    """
    card_id = str(card.get("id") or "")
    name = card.get("name") or "Unknown Pokémon Card"

    images = card.get("images") or {}
    set_info = card.get("set") or {}

    image_small = images.get("small")
    image_large = images.get("large") or image_small

    supertype = card.get("supertype")
    subtypes = card.get("subtypes") or []
    types = card.get("types") or []

    type_parts = []
    if supertype:
        type_parts.append(supertype)
    if subtypes:
        type_parts.append(" ".join(subtypes))
    if types:
        type_parts.append(f"({'/'.join(types)})")

    type_line = " - ".join(type_parts) if type_parts else None

    rules = card.get("rules") or []
    attacks = card.get("attacks") or []

    text_parts = []

    if card.get("flavorText"):
        text_parts.append(card["flavorText"])

    for rule in rules:
        text_parts.append(rule)

    for attack in attacks:
        attack_name = attack.get("name")
        attack_text = attack.get("text")
        attack_damage = attack.get("damage")

        attack_line = attack_name or "Attack"

        if attack_damage:
            attack_line += f" ({attack_damage})"

        if attack_text:
            attack_line += f": {attack_text}"

        text_parts.append(attack_line)

    oracle_text = "\n".join(text_parts) if text_parts else None

    return {
        "id": f"pokemon-{card_id}",
        "oracle_id": card_id or None,

        "name": name,
        "printed_name": None,
        "lang": "en",
        "layout": "normal",

        "set_code": set_info.get("id") or "PKM",
        "set_name": set_info.get("name") or "Pokémon TCG",
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
        "card_faces_json": None,
    }


def search_cards(parsed_cards: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Busca cartas de Pokémon na API externa e retorna no formato esperado pelo main.py.
    """
    results = {}

    for parsed_card in parsed_cards:
        card_name = parsed_card["name"]
        found_card = fetch_pokemon_card_by_name(card_name)

        if found_card:
            results[card_name] = [normalize_pokemon_card(found_card)]
        else:
            results[card_name] = []

    return results
"""
Yu-Gi-Oh Provider

Primeira versão básica:
- parseia decklists simples
- busca cartas na YGOPRODeck API
- normaliza a resposta para o formato atual do Deck Fill

Observação:
Esta versão ainda não usa cache local. Para produção, o ideal é criar cache/DB
para evitar excesso de chamadas externas.
"""

import re
from typing import Any, Dict, List, Optional, Tuple

import requests


YGOPRODECK_API_URL = "https://db.ygoprodeck.com/api/v7/cardinfo.php"


def parse_decklist(decklist: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parse simples de decklist de Yu-Gi-Oh.

    Suporta:
    - "3 Blue-Eyes White Dragon"
    - "1x Dark Magician"
    - "Monster Reborn"
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


def fetch_yugioh_card_by_name(card_name: str) -> Optional[Dict[str, Any]]:
    """
    Busca carta por nome exato/aproximado na YGOPRODeck.

    Primeiro tenta name=, se falhar tenta fname=.
    """
    try:
        exact_response = requests.get(
            YGOPRODECK_API_URL,
            params={"name": card_name},
            timeout=15,
        )

        if exact_response.status_code == 200:
            data = exact_response.json()
            cards = data.get("data", [])
            if cards:
                return cards[0]

        fuzzy_response = requests.get(
            YGOPRODECK_API_URL,
            params={"fname": card_name},
            timeout=15,
        )

        if fuzzy_response.status_code == 200:
            data = fuzzy_response.json()
            cards = data.get("data", [])
            if cards:
                return cards[0]

        return None

    except requests.RequestException as exc:
        print(f"Erro ao buscar Yu-Gi-Oh card '{card_name}': {exc}")
        return None


def normalize_yugioh_card(card: Dict[str, Any]) -> Dict[str, Any]:
    """
    Converte uma carta da YGOPRODeck para o formato CardResponse atual.

    Mantemos os campos de Magic como None quando não se aplicam,
    para preservar compatibilidade com o frontend atual.
    """
    card_id = str(card.get("id") or "")
    name = card.get("name") or "Unknown Yu-Gi-Oh Card"

    images = card.get("card_images") or []
    first_image = images[0] if images else {}

    image_url = first_image.get("image_url")
    image_url_small = first_image.get("image_url_small") or image_url
    image_url_cropped = first_image.get("image_url_cropped")

    type_line = card.get("type")
    description = card.get("desc")

    return {
        "id": f"yugioh-{card_id}",
        "oracle_id": card_id or None,

        "name": name,
        "printed_name": None,
        "lang": "en",
        "layout": "normal",

        "set_code": "YGO",
        "set_name": "Yu-Gi-Oh!",
        "collector_number": card_id or "unknown",
        "released_at": None,
        "rarity": None,

        "type_line": type_line,
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
        "card_faces_json": None,
    }


def search_cards(parsed_cards: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Busca cartas de Yu-Gi-Oh na API externa e retorna no formato esperado pelo main.py.
    """
    results = {}

    for parsed_card in parsed_cards:
        card_name = parsed_card["name"]
        found_card = fetch_yugioh_card_by_name(card_name)

        if found_card:
            results[card_name] = [normalize_yugioh_card(found_card)]
        else:
            results[card_name] = []

    return results
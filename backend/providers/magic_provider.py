"""
Magic Provider

Logica especifica de Magic: The Gathering:
- parse de decklist
- busca no banco SQLite local
- suporte a reprints especificos por set/collector number
- suporte a DFCs pelo nome da face frontal
"""

import contextlib
import re
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException

from providers import mpc_autofill_provider


DB_FILE = "cards.db"
LOCAL_ART_SOURCE_IDS = {"local", "scryfall", ""}


def get_db_connection() -> sqlite3.Connection:
    """Obtem uma conexao SQLite limpa."""
    if not Path(DB_FILE).exists():
        raise HTTPException(
            status_code=500,
            detail=f"Banco de dados '{DB_FILE}' nao encontrado. Execute sync_db.py primeiro.",
        )

    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
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


def get_lookup_key(parsed_card: Dict[str, Any]) -> str:
    return parsed_card.get("lookup_key") or "|".join([
        str(parsed_card.get("name") or "").strip().casefold(),
        str(parsed_card.get("set_code") or "").strip().casefold(),
        str(parsed_card.get("collector_number") or "").strip().casefold(),
    ])


def clean_card_name(card_name: str) -> str:
    # Para DFCs, buscar pela face frontal combina melhor com o Scryfall.
    card_name = card_name.split("//")[0].strip()
    return re.sub(r"\s+", " ", card_name).strip()


def parse_decklist(decklist: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parse de decklist Magic.

    Suporta:
    - "4 Lightning Bolt"
    - "4x Lightning Bolt"
    - "Lightning Bolt"
    - "1 Demonic Tutor (UMA) 93"
    - "1 Black Lotus (YDMU #35)"
    - "1 Tovolar, Dire Overlord // ... (SLD) 1612"
    """
    cards: List[Dict[str, Any]] = []
    errors: List[str] = []
    section_headers = {"deck", "sideboard", "commander", "companions"}

    set_patterns = [
        re.compile(
            r"^(?P<name>.+?)\s*\(\s*(?P<set>[A-Za-z0-9]{2,6})\s*(?:#|/|-)?\s*(?P<number>[A-Za-z0-9\-]+)\s*\)\s*$",
            re.IGNORECASE,
        ),
        re.compile(
            r"^(?P<name>.+?)\s*\(\s*(?P<set>[A-Za-z0-9]{2,6})\s*\)\s*#?\s*(?P<number>[A-Za-z0-9\-]+)\s*$",
            re.IGNORECASE,
        ),
        re.compile(
            r"^(?P<name>.+?)\s*\(\s*(?P<set>[A-Za-z0-9]{2,6})\s*\)\s*$",
            re.IGNORECASE,
        ),
    ]

    for line_num, raw_line in enumerate(decklist.strip().split("\n"), 1):
        line = raw_line.strip().rstrip(".")

        if not line or line.startswith("//") or line.startswith("#"):
            continue

        if line.lower().strip(":") in section_headers:
            continue

        quantity_match = re.match(r"^\s*(?:(\d+)\s*[xX]?\s+)?(.+?)\s*$", line)
        if not quantity_match:
            errors.append(f"Linha {line_num}: Formato nao reconhecido - {line}")
            continue

        quantity = int(quantity_match.group(1) or 1)
        card_name = quantity_match.group(2).strip()
        set_code = None
        collector_number = None

        for pattern in set_patterns:
            match = pattern.match(card_name)
            if match:
                card_name = match.group("name").strip()
                set_code = match.group("set").upper()
                collector_number = match.groupdict().get("number")
                break

        card_name = clean_card_name(card_name)

        if quantity <= 0 or not card_name:
            errors.append(f"Linha {line_num}: Formato nao reconhecido - {line}")
            continue

        cards.append({
            "quantity": quantity,
            "name": card_name,
            "set_code": set_code,
            "collector_number": collector_number,
            "line_number": line_num,
        })

    return cards, errors


def search_exact_printing(
    cursor: sqlite3.Cursor,
    card_name: str,
    set_code: str,
    collector_number: str,
    preferred_language: str = "en",
) -> List[Dict[str, Any]]:
    cursor.execute(f"""
        SELECT {CARD_SELECT_COLUMNS}
        FROM cards
        WHERE set_code COLLATE NOCASE = ? COLLATE NOCASE
          AND CAST(collector_number AS TEXT) COLLATE NOCASE = ? COLLATE NOCASE
          AND (
              name = ? COLLATE NOCASE
              OR name LIKE ? COLLATE NOCASE
              OR printed_name = ? COLLATE NOCASE
              OR printed_name LIKE ? COLLATE NOCASE
          )
          AND image_uri_normal IS NOT NULL
          AND image_uri_normal != ''
          AND layout != 'art_series'
        ORDER BY
            CASE
                WHEN lang = ? COLLATE NOCASE THEN 1
                WHEN lang = 'en' THEN 2
                WHEN lang = 'pt' THEN 3
                ELSE 5
            END ASC,
            CASE
                WHEN name = ? COLLATE NOCASE THEN 1
                WHEN name LIKE ? COLLATE NOCASE THEN 2
                ELSE 3
            END ASC
        LIMIT 1
    """, (
        set_code,
        str(collector_number),
        card_name,
        f"{card_name}%",
        card_name,
        f"{card_name}%",
        preferred_language,
        card_name,
        f"{card_name}%",
    ))
    return [dict(row) for row in cursor.fetchall()]


def search_by_exact_name(
    cursor: sqlite3.Cursor,
    card_name: str,
    preferred_language: str = "en",
) -> List[Dict[str, Any]]:
    cursor.execute(f"""
        SELECT {CARD_SELECT_COLUMNS}
        FROM cards
        WHERE name = ? COLLATE NOCASE
          AND image_uri_normal IS NOT NULL
          AND image_uri_normal != ''
          AND layout != 'art_series'
        ORDER BY
            CASE
                WHEN lang = ? COLLATE NOCASE THEN 1
                WHEN lang = 'en' THEN 2
                WHEN lang = 'pt' THEN 3
                ELSE 4
            END ASC,
            released_at DESC,
            set_code ASC,
            CAST(collector_number AS INTEGER) ASC
        LIMIT 10
    """, (card_name, preferred_language))
    return [dict(row) for row in cursor.fetchall()]


def search_by_loose_name(
    cursor: sqlite3.Cursor,
    card_name: str,
    preferred_language: str = "en",
) -> List[Dict[str, Any]]:
    loose_name = re.sub(r"[aeiouAEIOU\-.,']", "_", card_name)
    search_name = f"%{loose_name}%"

    cursor.execute(f"""
        SELECT {CARD_SELECT_COLUMNS}
        FROM cards
        WHERE name LIKE ? COLLATE NOCASE
          AND image_uri_normal IS NOT NULL
          AND image_uri_normal != ''
          AND layout != 'art_series'
        ORDER BY
            CASE WHEN name LIKE ? THEN 1 ELSE 2 END,
            CASE
                WHEN lang = ? COLLATE NOCASE THEN 1
                WHEN lang = 'en' THEN 2
                WHEN lang = 'pt' THEN 3
                ELSE 4
            END ASC,
            released_at DESC,
            set_code ASC,
            CAST(collector_number AS INTEGER) ASC
        LIMIT 10
    """, (search_name, f"{card_name}%", preferred_language))
    return [dict(row) for row in cursor.fetchall()]


def search_cards(
    parsed_cards: List[Dict[str, Any]],
    preferred_language: str = "en",
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Busca cartas no banco local.

    O resultado usa a mesma lookup_key do main.py para nao misturar reprints
    quando uma lista tem a mesma carta em edicoes diferentes.
    """
    results: Dict[str, List[Dict[str, Any]]] = {}

    with contextlib.closing(get_db_connection()) as conn:
        cursor = conn.cursor()

        for card in parsed_cards:
            card_name = card["name"]
            set_code = card.get("set_code")
            collector_number = card.get("collector_number")

            found_cards: List[Dict[str, Any]] = []

            if set_code and collector_number:
                found_cards = search_exact_printing(
                    cursor,
                    card_name,
                    set_code,
                    collector_number,
                    preferred_language,
                )

            if not found_cards:
                found_cards = search_by_exact_name(
                    cursor,
                    card_name,
                    preferred_language,
                )

            if not found_cards:
                found_cards = search_by_loose_name(
                    cursor,
                    card_name,
                    preferred_language,
                )

            results[get_lookup_key(card)] = found_cards

    return results


def normalize_art_source(source: Optional[str]) -> str:
    return (source or "scryfall").lower().strip()


def get_art_sources() -> List[Dict[str, Any]]:
    mpc_status = mpc_autofill_provider.get_status()

    return [
        {
            "id": "scryfall",
            "label": "Scryfall",
            "available": True,
            "is_default": True,
        },
        {
            "id": "mpc",
            "label": "MPC Autofill",
            "available": bool(mpc_status.get("online")),
            "status": mpc_status,
        },
    ]


def get_printings_by_name(card_name: str, limit: int = 80) -> List[Dict[str, Any]]:
    try:
        with contextlib.closing(get_db_connection()) as conn:
            cursor = conn.cursor()
            search_name = card_name.split("//")[0].strip()

            cursor.execute(f"""
                SELECT {CARD_SELECT_COLUMNS}
                FROM cards
                WHERE name LIKE ?
                COLLATE NOCASE
                AND image_uri_normal IS NOT NULL
                AND image_uri_normal != ''
                AND layout != 'art_series'
                ORDER BY set_code DESC, collector_number ASC
                LIMIT ?
            """, (search_name + "%", limit))

            return [dict(row) for row in cursor.fetchall()]

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar impressoes de Magic: {exc}",
        )


def get_printings_by_id(
    card_id: str,
    *,
    source: str = "scryfall",
    name: Optional[str] = None,
    limit: int = 80,
) -> Dict[str, Any]:
    source = normalize_art_source(source)

    if source == "mpc":
        search_name = name or card_id
        results = mpc_autofill_provider.search_printings(search_name, limit=limit)
        return {
            "card_id": card_id,
            "source": "mpc",
            "count": len(results),
            "results": results,
        }

    if source not in LOCAL_ART_SOURCE_IDS:
        raise HTTPException(
            status_code=400,
            detail=f"Fonte de arte '{source}' nao esta disponivel para Magic.",
        )

    try:
        with contextlib.closing(get_db_connection()) as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT oracle_id
                FROM cards
                WHERE id = ?
                LIMIT 1
            """, (card_id,))

            row = cursor.fetchone()

            if not row or not row["oracle_id"]:
                raise HTTPException(
                    status_code=404,
                    detail="Carta nao encontrada ou sem oracle_id.",
                )

            oracle_id = row["oracle_id"]

            cursor.execute(f"""
                SELECT {CARD_SELECT_COLUMNS}
                FROM cards
                WHERE oracle_id = ?
                  AND image_uri_normal IS NOT NULL
                  AND image_uri_normal != ''
                  AND layout != 'art_series'
                ORDER BY
                    CASE
                        WHEN lang = 'en' THEN 1
                        WHEN lang = 'pt' THEN 2
                        ELSE 3
                    END ASC,
                    released_at DESC,
                    set_code ASC,
                    CAST(collector_number AS INTEGER) ASC
                LIMIT ?
            """, (oracle_id, limit))

            results = [dict(row) for row in cursor.fetchall()]

            return {
                "card_id": card_id,
                "source": "scryfall",
                "oracle_id": oracle_id,
                "count": len(results),
                "results": results,
            }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar impressoes por id: {exc}",
        )


def search_printings(
    card_name: str,
    *,
    source: str = "scryfall",
    limit: int = 80,
) -> List[Dict[str, Any]]:
    source = normalize_art_source(source)

    if source == "mpc":
        return mpc_autofill_provider.search_printings(card_name, limit=limit)

    if source in LOCAL_ART_SOURCE_IDS:
        return get_printings_by_name(card_name, limit=limit)

    raise HTTPException(
        status_code=400,
        detail=f"Fonte de arte '{source}' nao esta disponivel para Magic.",
    )

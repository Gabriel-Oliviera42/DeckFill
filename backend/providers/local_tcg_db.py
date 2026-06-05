"""
Helpers para bancos locais de TCGs que nao usam Scryfall.

Pokemon e Yu-Gi-Oh! ficam em bancos separados, mas expõem o mesmo formato
CardResponse usado pelo frontend.
"""

from __future__ import annotations

import contextlib
import re
import sqlite3
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple

from fastapi import HTTPException


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


RESPONSE_COLUMNS = [
    "id",
    "oracle_id",
    "name",
    "printed_name",
    "lang",
    "layout",
    "set_code",
    "set_name",
    "collector_number",
    "released_at",
    "rarity",
    "type_line",
    "printed_type_line",
    "oracle_text",
    "printed_text",
    "image_uri_normal",
    "image_uri_png",
    "image_uri_art_crop",
    "image_uri_back_normal",
    "image_uri_back_png",
    "image_uri_back_art_crop",
    "back_name",
    "back_printed_name",
    "back_type_line",
    "back_oracle_text",
    "back_printed_text",
    "all_parts_json",
    "card_faces_json",
]


def normalize_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip().casefold()


def normalize_alias(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip().casefold()


def make_alias_blob(values: Iterable[str | None]) -> str:
    aliases = sorted({normalize_alias(value) for value in values if value})
    return "|" + "|".join(aliases) + "|" if aliases else "|"


def database_exists(db_file: str) -> bool:
    return Path(db_file).exists()


def get_db_connection(db_file: str, game_label: str) -> sqlite3.Connection:
    if not database_exists(db_file):
        raise HTTPException(
            status_code=500,
            detail=f"Banco local de {game_label} nao encontrado. Execute sync_tcg_db.py primeiro.",
        )

    conn = sqlite3.connect(db_file, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def row_to_card(row: sqlite3.Row | Dict[str, Any]) -> Dict[str, Any]:
    data = dict(row)
    return {column: data.get(column) for column in RESPONSE_COLUMNS}


def get_lookup_key(parsed_card: Dict[str, Any]) -> str:
    return parsed_card.get("lookup_key") or "|".join([
        normalize_text(parsed_card.get("name")),
        normalize_text(parsed_card.get("set_code")),
        normalize_text(parsed_card.get("collector_number")),
    ])


PrintingHintExtractor = Callable[[str], Tuple[str, Optional[str], Optional[str]]]


def parse_simple_decklist(
    decklist: str,
    *,
    section_headers: Iterable[str] | None = None,
    extract_printing_hint: PrintingHintExtractor | None = None,
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Parse comum para TCGs com linhas do tipo `2 Nome da Carta`."""
    cards: List[Dict[str, Any]] = []
    errors: List[str] = []
    ignored_headers = {normalize_text(header).strip(":") for header in section_headers or []}

    for line_num, raw_line in enumerate(decklist.strip().split("\n"), 1):
        line = raw_line.strip().rstrip(".")
        normalized_line = normalize_text(line).strip(":")

        if (
            not line
            or line.startswith("//")
            or line.startswith("#")
            or normalized_line in ignored_headers
        ):
            continue

        match = re.match(r"^\s*(?:(\d+)\s*[xX]?\s+)?(.+?)\s*$", line)

        if not match:
            errors.append(f"Linha {line_num}: Formato nao reconhecido - {line}")
            continue

        try:
            quantity = int(match.group(1) or 1)
        except ValueError:
            errors.append(f"Linha {line_num}: Erro ao processar quantidade - {line}")
            continue

        card_name = match.group(2).strip()
        set_code = None
        collector_number = None

        if extract_printing_hint:
            card_name, set_code, collector_number = extract_printing_hint(card_name)

        card_name = re.sub(r"\s+", " ", card_name).strip()

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


def create_cards_schema(conn: sqlite3.Connection) -> None:
    cursor = conn.cursor()

    cursor.execute("DROP TABLE IF EXISTS cards")
    cursor.execute("""
        CREATE TABLE cards (
            id TEXT PRIMARY KEY,
            oracle_id TEXT,
            name TEXT NOT NULL,
            printed_name TEXT,
            lang TEXT DEFAULT 'en',
            layout TEXT,

            set_code TEXT NOT NULL,
            set_name TEXT,
            collector_number TEXT NOT NULL,
            released_at TEXT,
            rarity TEXT,

            type_line TEXT,
            printed_type_line TEXT,
            oracle_text TEXT,
            printed_text TEXT,

            image_uri_normal TEXT,
            image_uri_png TEXT,
            image_uri_art_crop TEXT,

            image_uri_back_normal TEXT,
            image_uri_back_png TEXT,
            image_uri_back_art_crop TEXT,

            back_name TEXT,
            back_printed_name TEXT,
            back_type_line TEXT,
            back_oracle_text TEXT,
            back_printed_text TEXT,

            all_parts_json TEXT,
            card_faces_json TEXT,

            source_id TEXT,
            search_name TEXT,
            set_aliases TEXT,
            raw_json TEXT
        )
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cards_search_name ON cards(search_name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cards_oracle_id ON cards(oracle_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cards_source_id ON cards(source_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cards_set_collector ON cards(set_code, collector_number)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cards_collector ON cards(collector_number)")

    cursor.execute("DROP TABLE IF EXISTS sync_meta")
    cursor.execute("""
        CREATE TABLE sync_meta (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)

    conn.commit()


def insert_card(
    cursor: sqlite3.Cursor,
    card: Dict[str, Any],
    *,
    source_id: str | None,
    set_aliases: Iterable[str | None],
    raw_json: str | None,
) -> None:
    values = {column: card.get(column) for column in RESPONSE_COLUMNS}
    values["source_id"] = source_id
    values["search_name"] = normalize_text(card.get("name"))
    values["set_aliases"] = make_alias_blob(set_aliases)
    values["raw_json"] = raw_json

    cursor.execute("""
        INSERT OR REPLACE INTO cards (
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
            card_faces_json,
            source_id,
            search_name,
            set_aliases,
            raw_json
        )
        VALUES (
            :id,
            :oracle_id,
            :name,
            :printed_name,
            :lang,
            :layout,
            :set_code,
            :set_name,
            :collector_number,
            :released_at,
            :rarity,
            :type_line,
            :printed_type_line,
            :oracle_text,
            :printed_text,
            :image_uri_normal,
            :image_uri_png,
            :image_uri_art_crop,
            :image_uri_back_normal,
            :image_uri_back_png,
            :image_uri_back_art_crop,
            :back_name,
            :back_printed_name,
            :back_type_line,
            :back_oracle_text,
            :back_printed_text,
            :all_parts_json,
            :card_faces_json,
            :source_id,
            :search_name,
            :set_aliases,
            :raw_json
        )
    """, values)


def _search_exact_printing(
    cursor: sqlite3.Cursor,
    card_name: str,
    set_code: str,
    collector_number: str,
) -> List[Dict[str, Any]]:
    alias = f"%|{normalize_alias(set_code)}|%"

    cursor.execute(f"""
        SELECT {CARD_SELECT_COLUMNS}
        FROM cards
        WHERE (
            set_code = ? COLLATE NOCASE
            OR set_aliases LIKE ?
        )
          AND collector_number = ? COLLATE NOCASE
          AND (
              name = ? COLLATE NOCASE
              OR search_name = ?
              OR name LIKE ? COLLATE NOCASE
          )
          AND image_uri_normal IS NOT NULL
          AND image_uri_normal != ''
        ORDER BY
            CASE
                WHEN search_name = ? THEN 1
                WHEN name LIKE ? COLLATE NOCASE THEN 2
                ELSE 3
            END ASC,
            released_at DESC,
            set_code ASC,
            collector_number ASC
        LIMIT 1
    """, (
        set_code,
        alias,
        str(collector_number),
        card_name,
        normalize_text(card_name),
        f"{card_name}%",
        normalize_text(card_name),
        f"{card_name}%",
    ))

    return [row_to_card(row) for row in cursor.fetchall()]


def _search_by_source_id(cursor: sqlite3.Cursor, source_id: str) -> List[Dict[str, Any]]:
    cursor.execute(f"""
        SELECT {CARD_SELECT_COLUMNS}
        FROM cards
        WHERE (
            source_id = ? COLLATE NOCASE
            OR collector_number = ? COLLATE NOCASE
        )
          AND image_uri_normal IS NOT NULL
          AND image_uri_normal != ''
        ORDER BY released_at DESC, set_code ASC, collector_number ASC
        LIMIT 10
    """, (source_id, source_id))

    return [row_to_card(row) for row in cursor.fetchall()]


def _search_by_collector_name(
    cursor: sqlite3.Cursor,
    card_name: str,
    collector_number: str,
) -> List[Dict[str, Any]]:
    cursor.execute(f"""
        SELECT {CARD_SELECT_COLUMNS}
        FROM cards
        WHERE collector_number = ? COLLATE NOCASE
          AND (
              name = ? COLLATE NOCASE
              OR search_name = ?
              OR name LIKE ? COLLATE NOCASE
          )
          AND image_uri_normal IS NOT NULL
          AND image_uri_normal != ''
        ORDER BY
            CASE
                WHEN search_name = ? THEN 1
                WHEN name LIKE ? COLLATE NOCASE THEN 2
                ELSE 3
            END ASC,
            released_at DESC,
            set_code ASC,
            collector_number ASC
        LIMIT 10
    """, (
        str(collector_number),
        card_name,
        normalize_text(card_name),
        f"{card_name}%",
        normalize_text(card_name),
        f"{card_name}%",
    ))

    return [row_to_card(row) for row in cursor.fetchall()]


def _search_by_exact_name(cursor: sqlite3.Cursor, card_name: str) -> List[Dict[str, Any]]:
    cursor.execute(f"""
        SELECT {CARD_SELECT_COLUMNS}
        FROM cards
        WHERE search_name = ?
          AND image_uri_normal IS NOT NULL
          AND image_uri_normal != ''
        ORDER BY
            released_at DESC,
            set_code ASC,
            collector_number ASC
        LIMIT 10
    """, (normalize_text(card_name),))

    return [row_to_card(row) for row in cursor.fetchall()]


def _search_by_loose_name(cursor: sqlite3.Cursor, card_name: str) -> List[Dict[str, Any]]:
    search_name = f"%{normalize_text(card_name)}%"

    cursor.execute(f"""
        SELECT {CARD_SELECT_COLUMNS}
        FROM cards
        WHERE search_name LIKE ?
          AND image_uri_normal IS NOT NULL
          AND image_uri_normal != ''
        ORDER BY
            CASE WHEN search_name LIKE ? THEN 1 ELSE 2 END,
            released_at DESC,
            set_code ASC,
            collector_number ASC
        LIMIT 10
    """, (search_name, f"{normalize_text(card_name)}%"))

    return [row_to_card(row) for row in cursor.fetchall()]


TOKEN_SEARCH_STOPWORDS = {
    "a",
    "an",
    "and",
    "as",
    "da",
    "das",
    "de",
    "do",
    "dos",
    "e",
    "em",
    "for",
    "in",
    "of",
    "on",
    "the",
    "to",
}


def _name_search_tokens(card_name: str) -> List[str]:
    normalized = normalize_text(card_name)
    normalized = re.sub(r"[^\w]+", " ", normalized, flags=re.UNICODE)
    tokens = []

    for token in normalized.split():
        if len(token) <= 1 or token in TOKEN_SEARCH_STOPWORDS:
            continue
        if token not in tokens:
            tokens.append(token)

    return tokens[:6]


def _search_by_name_tokens(cursor: sqlite3.Cursor, card_name: str) -> List[Dict[str, Any]]:
    tokens = _name_search_tokens(card_name)

    if len(tokens) < 2:
        return []

    where = " AND ".join("search_name LIKE ?" for _ in tokens)
    params = [f"%{token}%" for token in tokens]

    cursor.execute(f"""
        SELECT {CARD_SELECT_COLUMNS}
        FROM cards
        WHERE {where}
          AND image_uri_normal IS NOT NULL
          AND image_uri_normal != ''
        ORDER BY
            LENGTH(search_name) ASC,
            released_at DESC,
            set_code ASC,
            collector_number ASC
        LIMIT 10
    """, params)

    return [row_to_card(row) for row in cursor.fetchall()]


def search_cards_in_db(
    db_file: str,
    parsed_cards: List[Dict[str, Any]],
    game_label: str,
) -> Dict[str, List[Dict[str, Any]]]:
    results: Dict[str, List[Dict[str, Any]]] = {}

    with contextlib.closing(get_db_connection(db_file, game_label)) as conn:
        cursor = conn.cursor()

        for card in parsed_cards:
            card_name = card["name"]
            set_code = card.get("set_code")
            collector_number = card.get("collector_number")
            found_cards: List[Dict[str, Any]] = []

            if set_code and collector_number:
                found_cards = _search_exact_printing(
                    cursor,
                    card_name,
                    set_code,
                    str(collector_number),
                )

            if not found_cards and collector_number:
                found_cards = _search_by_collector_name(
                    cursor,
                    card_name,
                    str(collector_number),
                )

            if not found_cards and card_name.isdigit():
                found_cards = _search_by_source_id(cursor, card_name)

            if not found_cards:
                found_cards = _search_by_exact_name(cursor, card_name)

            if not found_cards:
                found_cards = _search_by_loose_name(cursor, card_name)

            if not found_cards:
                found_cards = _search_by_name_tokens(cursor, card_name)

            results[get_lookup_key(card)] = found_cards

    return results


def get_printings_by_id(
    db_file: str,
    card_id: str,
    game_label: str,
    limit: int = 80,
) -> Dict[str, Any]:
    with contextlib.closing(get_db_connection(db_file, game_label)) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT oracle_id, name
            FROM cards
            WHERE id = ?
            LIMIT 1
        """, (card_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Carta nao encontrada.")

        oracle_id = row["oracle_id"]
        name = row["name"]

        if oracle_id:
            cursor.execute(f"""
                SELECT {CARD_SELECT_COLUMNS}
                FROM cards
                WHERE oracle_id = ?
                  AND image_uri_normal IS NOT NULL
                  AND image_uri_normal != ''
                ORDER BY released_at DESC, set_code ASC, collector_number ASC
                LIMIT ?
            """, (oracle_id, limit))
        else:
            cursor.execute(f"""
                SELECT {CARD_SELECT_COLUMNS}
                FROM cards
                WHERE search_name = ?
                  AND image_uri_normal IS NOT NULL
                  AND image_uri_normal != ''
                ORDER BY released_at DESC, set_code ASC, collector_number ASC
                LIMIT ?
            """, (normalize_text(name), limit))

        results = [row_to_card(item) for item in cursor.fetchall()]

        return {
            "card_id": card_id,
            "oracle_id": oracle_id,
            "count": len(results),
            "results": results,
        }


def get_printings_by_name(
    db_file: str,
    card_name: str,
    game_label: str,
    limit: int = 80,
) -> List[Dict[str, Any]]:
    with contextlib.closing(get_db_connection(db_file, game_label)) as conn:
        cursor = conn.cursor()
        exact = _search_by_exact_name(cursor, card_name)

        if exact:
            oracle_id = exact[0].get("oracle_id")

            if oracle_id:
                cursor.execute(f"""
                    SELECT {CARD_SELECT_COLUMNS}
                    FROM cards
                    WHERE oracle_id = ?
                      AND image_uri_normal IS NOT NULL
                      AND image_uri_normal != ''
                    ORDER BY released_at DESC, set_code ASC, collector_number ASC
                    LIMIT ?
                """, (oracle_id, limit))
                return [row_to_card(row) for row in cursor.fetchall()]

            return exact[:limit]

        return _search_by_loose_name(cursor, card_name)[:limit]

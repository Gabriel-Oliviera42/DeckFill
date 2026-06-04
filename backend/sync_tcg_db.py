#!/usr/bin/env python3
"""Sincroniza bancos locais para TCGs que usam providers normalizados."""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import time
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set

import requests

from providers import (
    fab_provider,
    local_tcg_db,
    lorcana_provider,
    onepiece_provider,
    pokemon_provider,
    yugioh_provider,
)


POKEMON_API_URL = "https://api.pokemontcg.io/v2/cards"
YUGIOH_API_URL = "https://db.ygoprodeck.com/api/v7/cardinfo.php"
LORCAST_API_BASE = "https://api.lorcast.com/v0"
GOAGAIN_SETS_API_URL = "https://api.goagain.dev/v1/sets"
GOAGAIN_CARDS_API_URL = "https://api.goagain.dev/v1/cards"


def log(message: str) -> None:
    timestamp = time.strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}")


def response_columns_for_insert() -> str:
    return ", ".join(local_tcg_db.RESPONSE_COLUMNS)


def set_meta(cursor: sqlite3.Cursor, **values: Any) -> None:
    for key, value in values.items():
        cursor.execute(
            "INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)",
            (key, str(value)),
        )


def create_database(db_file: str, *, reset: bool = True) -> sqlite3.Connection:
    Path(db_file).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_file)
    if reset:
        local_tcg_db.create_cards_schema(conn)
    return conn


def table_exists(cursor: sqlite3.Cursor, table_name: str) -> bool:
    cursor.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table_name,),
    )
    return cursor.fetchone() is not None


def get_meta_value(cursor: sqlite3.Cursor, key: str) -> str | None:
    if not table_exists(cursor, "sync_meta"):
        return None

    cursor.execute("SELECT value FROM sync_meta WHERE key = ?", (key,))
    row = cursor.fetchone()
    return row[0] if row else None


def sync_pokemon(
    page_size: int = 250,
    throttle_seconds: float | None = None,
    *,
    resume: bool = False,
    start_page: int | None = None,
    max_pages: int | None = None,
    order_by: str = "id",
    request_timeout: float = 60,
    max_retries: int = 3,
) -> None:
    log("Sincronizando Pokemon TCG API para banco local...")
    api_key = os.getenv("POKEMON_TCG_API_KEY")
    headers = {"X-Api-Key": api_key} if api_key else {}
    throttle = 0.0 if api_key else 2.1

    if throttle_seconds is not None:
        throttle = throttle_seconds

    db_file = pokemon_provider.POKEMON_DB_FILE
    can_resume = resume and Path(db_file).exists()
    conn = create_database(db_file, reset=not can_resume)
    cursor = conn.cursor()

    existing_cards = 0

    if can_resume and table_exists(cursor, "cards"):
        existing_cards = cursor.execute("SELECT COUNT(*) FROM cards").fetchone()[0]
        meta_status = get_meta_value(cursor, "status")
        meta_total_count = get_meta_value(cursor, "total_count")

        if (
            meta_status == "complete"
            and start_page is None
            and (not meta_total_count or existing_cards >= int(meta_total_count))
        ):
            log(f"Pokemon ja esta completo: {existing_cards:,} cartas no banco local.")
            conn.close()
            return

        meta_next_page = get_meta_value(cursor, "next_page")
        inferred_page = (existing_cards // page_size) + 1
        page = start_page or int(meta_next_page or inferred_page)
        log(f"Retomando Pokemon: {existing_cards:,} cartas ja estavam no banco; proxima pagina {page}")
    else:
        if can_resume:
            local_tcg_db.create_cards_schema(conn)
        page = start_page or 1

    inserted = existing_cards
    processed = max((page - 1) * page_size, existing_cards)
    total_count = None
    pages_processed = 0
    partial = False
    started_at = time.time()

    try:
        while True:
            response = None

            for attempt in range(1, max_retries + 1):
                try:
                    response = requests.get(
                        POKEMON_API_URL,
                        params={
                            "page": page,
                            "pageSize": page_size,
                            "orderBy": order_by,
                        },
                        headers=headers,
                        timeout=request_timeout,
                    )
                    response.raise_for_status()
                    break
                except requests.RequestException as exc:
                    if attempt >= max_retries:
                        raise

                    wait_seconds = max(throttle, min(30, 5 * attempt))
                    log(
                        f"Pokemon pagina {page}: tentativa {attempt} falhou ({exc}); "
                        f"tentando novamente em {wait_seconds:.1f}s"
                    )
                    time.sleep(wait_seconds)

            if response is None:
                raise requests.RequestException(f"Sem resposta da pagina {page}")

            payload = response.json()
            cards = payload.get("data") or []

            if total_count is None:
                total_count = payload.get("totalCount")
                if total_count:
                    log(f"Total informado pela API: {total_count:,} cartas")

            if not cards:
                break

            for raw_card in cards:
                card = pokemon_provider.normalize_pokemon_card(raw_card)
                local_tcg_db.insert_card(
                    cursor,
                    card,
                    source_id=str(raw_card.get("id") or ""),
                    set_aliases=pokemon_provider.get_set_aliases(raw_card),
                    raw_json=json.dumps(raw_card, ensure_ascii=False),
                )
                inserted += 1

            processed += len(cards)
            pages_processed += 1

            set_meta(
                cursor,
                source="Pokemon TCG API v2",
                status="partial",
                synced_at=time.strftime("%Y-%m-%dT%H:%M:%S"),
                cards_inserted=inserted,
                next_page=page + 1,
                total_count=total_count or "",
                seconds=round(time.time() - started_at, 2),
            )
            conn.commit()

            log(f"Pokemon: pagina {page} processada ({processed:,} cartas)")

            if total_count and processed >= total_count:
                break

            if max_pages is not None and pages_processed >= max_pages:
                partial = True
                break

            page += 1

            if throttle > 0:
                time.sleep(throttle)

        status = "partial" if partial and (not total_count or processed < total_count) else "complete"
        set_meta(
            cursor,
            source="Pokemon TCG API v2",
            status=status,
            synced_at=time.strftime("%Y-%m-%dT%H:%M:%S"),
            cards_inserted=inserted,
            next_page=page + 1 if status == "partial" else "",
            total_count=total_count or "",
            seconds=round(time.time() - started_at, 2),
        )
        conn.commit()

        if status == "partial":
            log(f"Pokemon parcial: {inserted:,} cartas; continue com --resume")
        else:
            log(f"Pokemon concluido: {inserted:,} cartas em {time.time() - started_at:.1f}s")
        log(f"Banco: {pokemon_provider.POKEMON_DB_FILE}")
    finally:
        conn.close()


def iter_yugioh_printing_cards(raw_card: Dict[str, Any]) -> Iterable[Dict[str, Any]]:
    images = raw_card.get("card_images") or []
    card_sets = raw_card.get("card_sets") or []

    if card_sets:
        for card_set in card_sets:
            if images:
                for image in images:
                    yield yugioh_provider.normalize_yugioh_card(raw_card, image, card_set)
            else:
                yield yugioh_provider.normalize_yugioh_card(raw_card, card_set=card_set)
        return

    if not images:
        yield yugioh_provider.normalize_yugioh_card(raw_card)
        return

    for image in images:
        yield yugioh_provider.normalize_yugioh_card(raw_card, image)


def sync_yugioh() -> None:
    log("Sincronizando YGOPRODeck para banco local...")
    conn = create_database(yugioh_provider.YUGIOH_DB_FILE)
    cursor = conn.cursor()
    started_at = time.time()
    inserted = 0

    try:
        response = requests.get(YUGIOH_API_URL, timeout=90)
        response.raise_for_status()
        payload = response.json()
        cards: List[Dict[str, Any]] = payload.get("data") or []

        log(f"YGOPRODeck retornou {len(cards):,} cartas base")

        for index, raw_card in enumerate(cards, 1):
            for card in iter_yugioh_printing_cards(raw_card):
                local_tcg_db.insert_card(
                    cursor,
                    card,
                    source_id=str(raw_card.get("id") or ""),
                    set_aliases=yugioh_provider.get_set_aliases(raw_card),
                    raw_json=json.dumps(raw_card, ensure_ascii=False),
                )
                inserted += 1

            if index % 1000 == 0:
                conn.commit()
                log(f"Yu-Gi-Oh!: {index:,} cartas base processadas")

        set_meta(
            cursor,
            source="YGOPRODeck API v7",
            synced_at=time.strftime("%Y-%m-%dT%H:%M:%S"),
            cards_inserted=inserted,
            base_cards=len(cards),
            seconds=round(time.time() - started_at, 2),
        )
        conn.commit()

        log(f"Yu-Gi-Oh! concluido: {inserted:,} artes/cartas em {time.time() - started_at:.1f}s")
        log(f"Banco: {yugioh_provider.YUGIOH_DB_FILE}")
    finally:
        conn.close()


def extract_list_payload(payload: Any) -> List[Dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]

    if isinstance(payload, dict):
        for key in ("results", "data", "cards", "sets"):
            value = payload.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]

    return []


def sync_lorcana(
    *,
    request_timeout: float = 60,
    max_sets: Optional[int] = None,
) -> None:
    log("Sincronizando Disney Lorcana via Lorcast para banco local...")
    conn = create_database(lorcana_provider.LORCANA_DB_FILE)
    cursor = conn.cursor()
    started_at = time.time()
    inserted = 0
    processed_sets = 0

    try:
        response = requests.get(f"{LORCAST_API_BASE}/sets", timeout=request_timeout)
        response.raise_for_status()
        sets = extract_list_payload(response.json())

        if not sets:
            raise RuntimeError("Lorcast nao retornou sets.")

        log(f"Lorcast retornou {len(sets):,} sets")

        for set_index, set_info in enumerate(sets, 1):
            if max_sets is not None and processed_sets >= max_sets:
                break

            set_identifier = set_info.get("id") or set_info.get("code")
            if not set_identifier:
                continue

            cards_response = requests.get(
                f"{LORCAST_API_BASE}/sets/{set_identifier}/cards",
                timeout=request_timeout,
            )
            cards_response.raise_for_status()
            cards = extract_list_payload(cards_response.json())

            for raw_card in cards:
                card = lorcana_provider.normalize_lorcana_card(raw_card)
                local_tcg_db.insert_card(
                    cursor,
                    card,
                    source_id=str(raw_card.get("id") or ""),
                    set_aliases=lorcana_provider.get_set_aliases(raw_card),
                    raw_json=json.dumps(raw_card, ensure_ascii=False),
                )
                inserted += 1

            processed_sets += 1

            set_meta(
                cursor,
                source="Lorcast API v0",
                status="partial",
                synced_at=time.strftime("%Y-%m-%dT%H:%M:%S"),
                cards_inserted=inserted,
                sets_processed=processed_sets,
                seconds=round(time.time() - started_at, 2),
            )
            conn.commit()

            log(
                f"Lorcana: set {set_index}/{len(sets)} processado "
                f"({len(cards):,} cartas; {inserted:,} total)"
            )

        status = "partial" if max_sets is not None and processed_sets < len(sets) else "complete"
        set_meta(
            cursor,
            source="Lorcast API v0",
            status=status,
            synced_at=time.strftime("%Y-%m-%dT%H:%M:%S"),
            cards_inserted=inserted,
            sets_processed=processed_sets,
            total_sets=len(sets),
            seconds=round(time.time() - started_at, 2),
        )
        conn.commit()

        log(f"Lorcana {status}: {inserted:,} cartas em {time.time() - started_at:.1f}s")
        log(f"Banco: {lorcana_provider.LORCANA_DB_FILE}")
    finally:
        conn.close()


def sync_onepiece(*, request_timeout: float = 90) -> None:
    log("Sincronizando One Piece Card Game via OPTCG API para banco local...")
    conn = create_database(onepiece_provider.ONEPIECE_DB_FILE)
    cursor = conn.cursor()
    started_at = time.time()
    inserted = 0
    seen: Set[str] = set()

    try:
        for endpoint in onepiece_provider.ONEPIECE_API_ENDPOINTS:
            response = requests.get(endpoint, timeout=request_timeout)
            if response.status_code == 404:
                log(f"OPTCG endpoint indisponivel (404), pulando: {endpoint}")
                continue

            response.raise_for_status()
            raw_cards = extract_list_payload(response.json())
            log(f"OPTCG endpoint {endpoint} retornou {len(raw_cards):,} cartas")

            for raw_card in raw_cards:
                source_id = str(
                    raw_card.get("card_set_id")
                    or raw_card.get("card_image_id")
                    or raw_card.get("id")
                    or ""
                )
                image_url = str(raw_card.get("card_image") or raw_card.get("image_url") or "")
                unique_key = "|".join([
                    source_id,
                    image_url,
                    str(raw_card.get("card_name") or raw_card.get("name") or ""),
                ]).casefold()

                if unique_key in seen:
                    continue

                seen.add(unique_key)
                card = onepiece_provider.normalize_onepiece_card(raw_card)
                local_tcg_db.insert_card(
                    cursor,
                    card,
                    source_id=source_id,
                    set_aliases=onepiece_provider.get_set_aliases(raw_card),
                    raw_json=json.dumps(raw_card, ensure_ascii=False),
                )
                inserted += 1

                if inserted % 500 == 0:
                    conn.commit()
                    log(f"One Piece: {inserted:,} cartas processadas")

        set_meta(
            cursor,
            source="OPTCG API",
            status="complete",
            synced_at=time.strftime("%Y-%m-%dT%H:%M:%S"),
            cards_inserted=inserted,
            seconds=round(time.time() - started_at, 2),
        )
        conn.commit()

        log(f"One Piece concluido: {inserted:,} cartas em {time.time() - started_at:.1f}s")
        log(f"Banco: {onepiece_provider.ONEPIECE_DB_FILE}")
    finally:
        conn.close()


def fetch_fab_set_names(request_timeout: float) -> Dict[str, str]:
    response = requests.get(GOAGAIN_SETS_API_URL, params={"limit": 500}, timeout=request_timeout)
    response.raise_for_status()
    sets = extract_list_payload(response.json())

    set_names: Dict[str, str] = {}
    for set_info in sets:
        set_id = str(set_info.get("id") or "").upper()
        set_name = set_info.get("name")
        if set_id and set_name:
            set_names[set_id] = str(set_name)

    return set_names


def sync_fab(
    *,
    page_size: int = 100,
    start_offset: int = 0,
    max_pages: Optional[int] = None,
    request_timeout: float = 90,
) -> None:
    log("Sincronizando Flesh and Blood via GoAgain API para banco local...")
    conn = create_database(fab_provider.FAB_DB_FILE)
    cursor = conn.cursor()
    started_at = time.time()
    inserted = 0
    processed_cards = 0
    pages_processed = 0
    offset = start_offset
    total_count: Optional[int] = None

    try:
        set_names = fetch_fab_set_names(request_timeout)
        log(f"GoAgain retornou {len(set_names):,} sets para FAB")

        while True:
            response = requests.get(
                GOAGAIN_CARDS_API_URL,
                params={"limit": page_size, "offset": offset},
                timeout=request_timeout,
            )
            response.raise_for_status()
            payload = response.json()
            raw_cards = extract_list_payload(payload)

            if total_count is None and isinstance(payload, dict):
                total_count = payload.get("total")
                if total_count:
                    log(f"Total informado pela GoAgain API: {total_count:,} cartas base")

            if not raw_cards:
                break

            for raw_card in raw_cards:
                printings = raw_card.get("printings") or [None]

                for printing in printings:
                    if printing is not None and not isinstance(printing, dict):
                        continue

                    card = fab_provider.normalize_fab_card(
                        raw_card,
                        printing,
                        set_names=set_names,
                    )
                    source_id = str(
                        (printing or {}).get("unique_id")
                        or (printing or {}).get("id")
                        or raw_card.get("unique_id")
                        or ""
                    )
                    local_tcg_db.insert_card(
                        cursor,
                        card,
                        source_id=source_id,
                        set_aliases=fab_provider.get_set_aliases(raw_card, printing),
                        raw_json=json.dumps(
                            {"card": raw_card, "printing": printing},
                            ensure_ascii=False,
                        ),
                    )
                    inserted += 1

            processed_cards += len(raw_cards)
            pages_processed += 1
            offset += page_size

            set_meta(
                cursor,
                source="GoAgain API v1",
                status="partial",
                synced_at=time.strftime("%Y-%m-%dT%H:%M:%S"),
                cards_inserted=inserted,
                base_cards_processed=processed_cards,
                next_offset=offset,
                total_count=total_count or "",
                seconds=round(time.time() - started_at, 2),
            )
            conn.commit()

            log(
                f"FAB: {processed_cards:,} cartas base, "
                f"{inserted:,} printagens processadas"
            )

            if total_count and processed_cards >= total_count:
                break

            if max_pages is not None and pages_processed >= max_pages:
                break

        status = (
            "partial"
            if max_pages is not None and (not total_count or processed_cards < total_count)
            else "complete"
        )
        set_meta(
            cursor,
            source="GoAgain API v1",
            status=status,
            synced_at=time.strftime("%Y-%m-%dT%H:%M:%S"),
            cards_inserted=inserted,
            base_cards_processed=processed_cards,
            next_offset=offset if status == "partial" else "",
            total_count=total_count or "",
            seconds=round(time.time() - started_at, 2),
        )
        conn.commit()

        log(f"FAB {status}: {inserted:,} printagens em {time.time() - started_at:.1f}s")
        log(f"Banco: {fab_provider.FAB_DB_FILE}")
    finally:
        conn.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sincroniza bancos locais multi-TCG.")
    parser.add_argument(
        "game",
        choices=["pokemon", "yugioh", "lorcana", "onepiece", "fab", "all"],
        help="Qual banco sincronizar.",
    )
    parser.add_argument(
        "--pokemon-throttle",
        type=float,
        default=None,
        help="Intervalo entre paginas da Pokemon TCG API. Sem API key, mantenha perto de 2.1s.",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Retoma a sincronizacao sem apagar o banco existente.",
    )
    parser.add_argument(
        "--pokemon-start-page",
        type=int,
        default=None,
        help="Pagina inicial da Pokemon TCG API. Normalmente use --resume em vez disso.",
    )
    parser.add_argument(
        "--pokemon-max-pages",
        type=int,
        default=None,
        help="Limita quantas paginas Pokemon processar nesta execucao.",
    )
    parser.add_argument(
        "--pokemon-order-by",
        default="id",
        help="Ordenacao da Pokemon TCG API. Use um campo simples para evitar erro em paginas altas.",
    )
    parser.add_argument(
        "--pokemon-timeout",
        type=float,
        default=60,
        help="Timeout por pagina da Pokemon TCG API.",
    )
    parser.add_argument(
        "--pokemon-retries",
        type=int,
        default=3,
        help="Tentativas por pagina da Pokemon TCG API antes de falhar.",
    )
    parser.add_argument(
        "--lorcana-timeout",
        type=float,
        default=60,
        help="Timeout por requisicao da Lorcast API.",
    )
    parser.add_argument(
        "--lorcana-max-sets",
        type=int,
        default=None,
        help="Limita quantos sets de Lorcana processar nesta execucao.",
    )
    parser.add_argument(
        "--onepiece-timeout",
        type=float,
        default=90,
        help="Timeout por endpoint da OPTCG API.",
    )
    parser.add_argument(
        "--fab-page-size",
        type=int,
        default=100,
        help="Quantidade de cartas base por pagina da GoAgain API.",
    )
    parser.add_argument(
        "--fab-start-offset",
        type=int,
        default=0,
        help="Offset inicial para sincronizacao FAB.",
    )
    parser.add_argument(
        "--fab-max-pages",
        type=int,
        default=None,
        help="Limita quantas paginas FAB processar nesta execucao.",
    )
    parser.add_argument(
        "--fab-timeout",
        type=float,
        default=90,
        help="Timeout por requisicao da GoAgain API.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    try:
        if args.game in {"pokemon", "all"}:
            sync_pokemon(
                throttle_seconds=args.pokemon_throttle,
                resume=args.resume,
                start_page=args.pokemon_start_page,
                max_pages=args.pokemon_max_pages,
                order_by=args.pokemon_order_by,
                request_timeout=args.pokemon_timeout,
                max_retries=args.pokemon_retries,
            )

        if args.game in {"yugioh", "all"}:
            sync_yugioh()

        if args.game in {"lorcana", "all"}:
            sync_lorcana(
                request_timeout=args.lorcana_timeout,
                max_sets=args.lorcana_max_sets,
            )

        if args.game in {"onepiece", "all"}:
            sync_onepiece(request_timeout=args.onepiece_timeout)

        if args.game in {"fab", "all"}:
            sync_fab(
                page_size=args.fab_page_size,
                start_offset=args.fab_start_offset,
                max_pages=args.fab_max_pages,
                request_timeout=args.fab_timeout,
            )

    except KeyboardInterrupt:
        log("Sincronizacao interrompida pelo usuario.")
        sys.exit(1)
    except requests.RequestException as exc:
        log(f"Erro de rede/API: {exc}")
        sys.exit(1)
    except Exception as exc:
        log(f"Erro fatal: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()

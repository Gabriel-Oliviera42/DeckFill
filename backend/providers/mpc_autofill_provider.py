"""Adapter para MPC Autofill como fonte opcional de artes."""

from __future__ import annotations

import os
from typing import Any, Dict, Iterable, List, Optional
from urllib.parse import urljoin

import requests


DEFAULT_MPC_AUTOFILL_BASE_URL = "https://mpcfill.com"
MPC_AUTOFILL_BASE_URL = os.getenv(
    "MPC_AUTOFILL_BASE_URL",
    DEFAULT_MPC_AUTOFILL_BASE_URL,
).rstrip("/")
MPC_AUTOFILL_TIMEOUT_SECONDS = 30
_SOURCE_PAIRS_CACHE: Optional[List[List[Any]]] = None


def _api_url(path: str, version: str = "2") -> Optional[str]:
    explicit = {
        "editorSearch": os.getenv("MPC_AUTOFILL_EDITOR_SEARCH_URL"),
        "cards": os.getenv("MPC_AUTOFILL_CARDS_URL"),
        "info": os.getenv("MPC_AUTOFILL_INFO_URL"),
        "sources": os.getenv("MPC_AUTOFILL_SOURCES_URL"),
        "searchEngineHealth": os.getenv("MPC_AUTOFILL_HEALTH_URL"),
    }.get(path)

    if explicit:
        return explicit

    if not MPC_AUTOFILL_BASE_URL:
        return None

    base = MPC_AUTOFILL_BASE_URL.rstrip("/")

    if base.endswith("/api"):
        base = base[:-4]

    if base.endswith(f"/{version}"):
        return urljoin(base + "/", f"{path.strip('/')}/")

    return urljoin(base + "/", f"{version}/{path.strip('/')}/")


def _query_key(card_name: str, card_type: str = "CARD") -> str:
    return f"{card_type}:{card_name.strip().casefold()}"


def _get_source_pairs() -> List[List[Any]]:
    global _SOURCE_PAIRS_CACHE

    if _SOURCE_PAIRS_CACHE is not None:
        return _SOURCE_PAIRS_CACHE

    data = _request_json("GET", _api_url("sources"))
    results = data.get("results") if isinstance(data, dict) else None

    if not isinstance(results, dict):
        return []

    sources: List[List[Any]] = []

    for source in results.values():
        if not isinstance(source, dict):
            continue

        pk = source.get("pk")

        try:
            sources.append([int(pk), True])
        except (TypeError, ValueError):
            continue

    if sources:
        _SOURCE_PAIRS_CACHE = sources

    return sources


def _default_search_settings() -> Dict[str, Any]:
    return {
        "filterSettings": {
            "excludesTags": ["NSFW"],
            "includesTags": [],
            "languages": [],
            "maximumDPI": 1500,
            "maximumSize": 30,
            "minimumDPI": 0,
        },
        "searchTypeSettings": {
            "filterCardbacks": False,
            "fuzzySearch": True,
        },
        "sourceSettings": {
            "sources": _get_source_pairs(),
        },
    }


def _request_json(method: str, url: Optional[str], **kwargs: Any) -> Optional[Dict[str, Any]]:
    if not url:
        return None

    try:
        response = requests.request(
            method,
            url,
            timeout=MPC_AUTOFILL_TIMEOUT_SECONDS,
            **kwargs,
        )
        if response.status_code >= 400:
            return None
        data = response.json()
        return data if isinstance(data, dict) else None
    except (requests.RequestException, ValueError):
        return None


def _extract_identifiers(search_data: Dict[str, Any], card_name: str) -> List[str]:
    results = search_data.get("results") or search_data
    identifiers: List[str] = []

    if not isinstance(results, dict):
        return identifiers

    candidates = [
        results.get(card_name),
        results.get(card_name.casefold()),
        results.get(_query_key(card_name)),
    ]

    if len(results) == 1:
        candidates.append(next(iter(results.values())))

    for candidate in candidates:
        if isinstance(candidate, dict):
            for value in candidate.values():
                if isinstance(value, list):
                    identifiers.extend(str(item) for item in value)
                elif isinstance(value, dict):
                    hits = value.get("hits")
                    if isinstance(hits, list):
                        identifiers.extend(str(item) for item in hits)
        elif isinstance(candidate, list):
            for item in candidate:
                if isinstance(item, dict):
                    identifier = _first_value(item, ["identifier", "id", "key"])
                    if identifier:
                        identifiers.append(identifier)
                else:
                    identifiers.append(str(item))

    seen = set()
    deduped = []

    for identifier in identifiers:
        if identifier not in seen:
            deduped.append(identifier)
            seen.add(identifier)

    return deduped


def _extract_cards(cards_data: Dict[str, Any]) -> Iterable[Dict[str, Any]]:
    results = cards_data.get("results") or cards_data.get("cards") or cards_data

    if isinstance(results, dict):
        for value in results.values():
            if isinstance(value, dict):
                yield value
    elif isinstance(results, list):
        for value in results:
            if isinstance(value, dict):
                yield value


def _first_value(card: Dict[str, Any], keys: Iterable[str]) -> Optional[str]:
    for key in keys:
        value = card.get(key)
        if value:
            return str(value)
    return None


def _image_from_drive_id(drive_id: Optional[str]) -> Optional[str]:
    if not drive_id:
        return None
    return f"https://drive.google.com/thumbnail?id={drive_id}&sz=w672"


def normalize_mpc_card(card: Dict[str, Any], fallback_name: str) -> Optional[Dict[str, Any]]:
    identifier = _first_value(card, ["identifier", "id", "key", "cardId", "card_id"])
    drive_id = _first_value(card, ["driveId", "drive_id", "gdriveId", "googleDriveId", "fileId"])
    name = _first_value(card, ["name", "cardName", "query", "searchq"]) or fallback_name

    preview_url = _first_value(
        card,
        [
            "imageUrl",
            "image_url",
            "previewUrl",
            "preview_url",
            "frontUrl",
            "mediumThumbnailUrl",
            "smallThumbnailUrl",
            "thumbnailUrl",
            "thumbnail",
            "url",
        ],
    ) or _image_from_drive_id(drive_id or identifier)
    download_url = _first_value(card, ["downloadLink", "downloadUrl", "download_url"])

    if not preview_url or not identifier:
        return None

    source = card.get("source") or {}
    source_name = source.get("name") if isinstance(source, dict) else source
    source_key = source.get("key") if isinstance(source, dict) else source
    set_code = (
        _first_value(card, ["set", "setCode", "sourceKey", "sourceName", "source"])
        or source_key
        or "MPC"
    )
    collector_number = _first_value(card, ["collectorNumber", "collector_number"]) or identifier

    return {
        "id": f"mpc-{identifier}",
        "oracle_id": f"mpc:{name.casefold()}",

        "name": name,
        "printed_name": None,
        "lang": _first_value(card, ["language", "lang"]) or "en",
        "layout": "normal",

        "set_code": str(set_code).upper(),
        "set_name": str(source_name or "MPC Autofill"),
        "collector_number": str(collector_number),
        "released_at": None,
        "rarity": _first_value(card, ["rarity", "finish", "dpi"]),

        "type_line": "MPC Autofill",
        "printed_type_line": _first_value(card, ["sourceType"]),
        "oracle_text": _first_value(card, ["artist", "creator", "description", "sourceVerbose"]),
        "printed_text": None,

        "image_uri_normal": preview_url,
        "image_uri_png": preview_url,
        "image_uri_art_crop": preview_url,
        "download_url": download_url,

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

        "art_source": "mpc",
    }


def search_printings(card_name: str, limit: int = 40) -> List[Dict[str, Any]]:
    """
    Busca artes no servidor MPC Autofill configurado.

    O formato do servidor MPC e comunitario e pode variar. Este adapter aceita
    respostas comuns do endpoint v2 e tambem permite substituir as URLs via env.
    """
    query = {
        "query": card_name,
        "cardType": "CARD",
    }

    v3_payload = {
        "queries": {
            _query_key(card_name): query,
        },
        "searchSettings": _default_search_settings(),
    }

    legacy_payload = {
        "queries": [
            query,
        ],
        "searchSettings": _default_search_settings(),
    }

    search_data = _request_json(
        "POST",
        _api_url("editorSearch", version="3"),
        json=v3_payload,
    )

    if not search_data:
        search_data = _request_json(
            "POST",
            _api_url("editorSearch", version="2"),
            json=legacy_payload,
        )

    if not search_data:
        return []

    identifiers = _extract_identifiers(search_data, card_name)[:limit]

    if not identifiers:
        return []

    cards_payload = {"cardIdentifiers": identifiers}
    cards_data = _request_json("POST", _api_url("cards"), json=cards_payload)

    if not cards_data:
        return []

    normalized = [
        item
        for item in (normalize_mpc_card(card, card_name) for card in _extract_cards(cards_data))
        if item
    ]

    return normalized[:limit]


def get_status() -> Dict[str, Any]:
    data = _request_json("GET", _api_url("info"))
    health = _request_json("GET", _api_url("searchEngineHealth"))
    configured = bool(MPC_AUTOFILL_BASE_URL or os.getenv("MPC_AUTOFILL_INFO_URL"))

    return {
        "base_url": MPC_AUTOFILL_BASE_URL,
        "configured": configured,
        "online": bool(data) and (not isinstance(health, dict) or health.get("online", True)),
        "info": data or {},
        "health": health or {},
        "source_count": len(_get_source_pairs()),
    }

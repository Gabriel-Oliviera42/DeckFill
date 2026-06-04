"""Contrato comum para providers de TCG."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Protocol, Tuple


CardDict = Dict[str, Any]
ParsedCard = Dict[str, Any]


class CardProvider(Protocol):
    def parse_decklist(self, decklist: str) -> Tuple[List[ParsedCard], List[str]]:
        ...

    def search_cards(
        self,
        parsed_cards: List[ParsedCard],
    ) -> Dict[str, List[CardDict]]:
        ...

    def get_art_sources(self) -> List[Dict[str, Any]]:
        ...

    def search_printings(
        self,
        card_name: str,
        *,
        source: str = "local",
        limit: int = 80,
    ) -> List[CardDict]:
        ...

    def get_printings_by_id(
        self,
        card_id: str,
        *,
        source: str = "local",
        name: Optional[str] = None,
        limit: int = 80,
    ) -> Dict[str, Any]:
        ...

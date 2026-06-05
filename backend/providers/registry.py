"""
Card Provider Registry

Centraliza a escolha do provider correto para cada TCG suportado.
"""

from fastapi import HTTPException

from providers import (
    fab_provider,
    lorcana_provider,
    magic_provider,
    onepiece_provider,
    pokemon_provider,
    yugioh_provider,
)
from providers.base import CardProvider

AVAILABLE_PROVIDERS: dict[str, CardProvider] = {
    "magic": magic_provider,
    "yugioh": yugioh_provider,
    "pokemon": pokemon_provider,
    "lorcana": lorcana_provider,
    "onepiece": onepiece_provider,
    "fab": fab_provider,
}


def normalize_game_key(game: str | None) -> str:
    return (game or "magic").lower().strip()


def get_card_provider(game: str | None) -> CardProvider:
    game_key = normalize_game_key(game)

    provider = AVAILABLE_PROVIDERS.get(game_key)

    if not provider:
        raise HTTPException(
            status_code=400,
            detail=f"O jogo '{game}' ainda não está disponível."
        )

    return provider

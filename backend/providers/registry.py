"""
Card Provider Registry

Centraliza a escolha do provider correto para cada TCG.

Nesta fase, apenas Magic está implementado.
Pokémon e Yu-Gi-Oh serão adicionados depois sem alterar diretamente o main.py.
"""

from fastapi import HTTPException

from providers import magic_provider

from providers import yugioh_provider

AVAILABLE_PROVIDERS = {
    "magic": magic_provider,
    "yugioh": yugioh_provider,
}


def normalize_game_key(game: str | None) -> str:
    return (game or "magic").lower().strip()


def get_card_provider(game: str | None):
    game_key = normalize_game_key(game)

    provider = AVAILABLE_PROVIDERS.get(game_key)

    if not provider:
        raise HTTPException(
            status_code=400,
            detail=f"O jogo '{game}' ainda não está disponível."
        )

    return provider
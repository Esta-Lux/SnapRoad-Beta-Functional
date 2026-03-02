# SnapRoad Backend Services
# Heavy/optional services are imported lazily by routes (orion_coach, photo_analysis, partner_service)
# so the app can start without OPENAI_API_KEY, Supabase, etc.
__all__ = ['orion_service', 'photo_service', 'partner_service']


def __getattr__(name):
    if name == 'orion_service':
        from .orion_coach import orion_service
        return orion_service
    if name == 'photo_service':
        from .photo_analysis import photo_service
        return photo_service
    if name == 'partner_service':
        from .partner_service import partner_service
        return partner_service
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

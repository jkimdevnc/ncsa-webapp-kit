"""Who is making the request. Swap point: CILogon login replaces only `current_user()`."""


def current_user() -> str:
    return "anonymous"

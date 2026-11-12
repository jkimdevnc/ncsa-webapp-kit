from app.config import Settings, app_version


def test_settings_come_from_env_vars(monkeypatch):
    monkeypatch.setenv("REDIS_URL", "redis://example:6380/2")

    assert Settings().redis_url == "redis://example:6380/2"


def test_settings_have_a_working_local_default(monkeypatch):
    monkeypatch.delenv("REDIS_URL", raising=False)

    assert Settings(_env_file=None).redis_url == "redis://localhost:6379/0"


def test_version_is_read_from_pyproject():
    assert app_version().count(".") == 2

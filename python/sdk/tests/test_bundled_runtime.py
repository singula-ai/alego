"""Keyless boot tests for the production exe and development alego carrier.

Each carrier skips independently when absent. The dummy API key only satisfies
adapter loading; initialize and shutdown do not call a model.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from alego import Alego, HarnessClient, HarnessConfig
from alego.errors import JsonRpcError, TransportClosedError
from alego_runtime import RUNTIME_MODE_ENV_VAR, resolve_bundled_launch_args

_MODES = ("exe", "node")


def _select_mode(mode: str, monkeypatch: pytest.MonkeyPatch) -> None:
    try:
        resolve_bundled_launch_args(mode)
    except FileNotFoundError as exc:
        pytest.skip(f"bundled {mode}-mode runtime unavailable on this machine: {exc}")
    monkeypatch.setenv(RUNTIME_MODE_ENV_VAR, mode)


def _client(tmp_path: Path, mode: str, monkeypatch: pytest.MonkeyPatch, *patches: Path) -> HarnessClient:
    _select_mode(mode, monkeypatch)
    return HarnessClient(
        HarnessConfig(
            alego_home=str(tmp_path / "home"),
            patches=tuple(str(patch) for patch in patches),
            cwd=str(tmp_path),
            env={
                # The lazily mounted adapter requires a key even without a model call.
                "DEEPSEEK_API_KEY": "sk-dummy-for-boot",
                "DEEPSEEK_BASE_URL": "http://127.0.0.1:9",
                "ALEGO_PERMISSION_MODE": "danger-full-access",
                "ALEGO_TELEMETRY_DISABLED": "1",
            },
            request_timeout_seconds=120,
        )
    )


@pytest.mark.parametrize("mode", _MODES)
def test_bundled_runtime_boots_the_sdk_profile(
    tmp_path: Path, mode: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    with _client(tmp_path, mode, monkeypatch) as client:
        init = client.initialize(provider="deepseek-official", cwd=str(tmp_path), model="deepseek-v4-pro")

    assert init.serverInfo is not None
    assert init.serverInfo.name == "alego-sdk-runtime"
    profile = json.loads((tmp_path / "home" / "profiles" / "sdk" / "package.json").read_text())
    assert profile["alego"]["profile"]["bundles"] == [
        "@singula-ai/alego-base",
        "@singula-ai/alego-sdk-app",
    ]


@pytest.mark.parametrize("mode", _MODES)
def test_python_sdk_applies_an_ordered_profile_patch(
    tmp_path: Path, mode: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    _select_mode(mode, monkeypatch)
    patch = tmp_path / "persona.patch.yml"
    patch.write_text(json.dumps([{
        "id": "system-prompt",
        "config": {"persona": "Python SDK ordered patch marker."},
    }]))
    harness = Alego(
        model="deepseek-v4-pro",
        cwd=str(tmp_path),
        alego_home=str(tmp_path / "home"),
        patches=(str(patch),),
        env={"ALEGO_PERMISSION_MODE": "danger-full-access"},
        api_key="sk-dummy-for-boot",
        base_url="http://127.0.0.1:9",
        request_timeout_seconds=120,
    )

    with harness:
        pass


@pytest.mark.parametrize("mode", _MODES)
def test_bundled_runtime_surfaces_unbundled_plugin_failure(
    tmp_path: Path, mode: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    patch = tmp_path / "missing.patch.yml"
    patch.write_text(json.dumps([{
        "insert": [{"id": "missing", "name": "@singula-ai/alego-does-not-exist"}],
    }]))

    client = _client(tmp_path, mode, monkeypatch, patch)
    client.start()
    try:
        with pytest.raises((JsonRpcError, TransportClosedError, TimeoutError)) as excinfo:
            client.initialize(provider="deepseek-official", cwd=str(tmp_path), model="deepseek-v4-pro")
    finally:
        client.close()

    assert "@singula-ai/alego-does-not-exist" in str(excinfo.value)

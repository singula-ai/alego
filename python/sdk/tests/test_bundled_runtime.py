"""Keyless boot tests for the production exe and development node carrier.

Each carrier skips independently when absent. The dummy API key only satisfies
adapter loading; initialize and shutdown do not call a model.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from alego import Alego, HarnessClient, HarnessConfig
from alego.errors import TransportClosedError
from alego_runtime import resolve_bundled_launch_args

_MODES = ("exe", "node")
_REPO_ROOT = Path(__file__).parents[3]
_MINIMAL_CONFIG = _REPO_ROOT / "examples" / "jsonrpc-agent" / "minimal.cordis.yml"

# The config must include the JSON-RPC serving plugin.
_CORDIS_YML = """\
- id: sdk-jsonrpc-server
  name: '@alego/sdk-jsonrpc-server'
- id: agent-core
  name: '@alego/agent-spine-demo'
  config:
    workspaceContext: false
- id: sessions
  name: '@alego/session-persistence-jsonl'
  config:
    root: './sessions'
- id: session-checkpoints
  name: '@alego/session-checkpoint-policy'
- id: subprocess
  name: '@alego/subprocess-local'
- id: bash
  name: '@alego/bash-local'
  config:
    cwd: '.'
- id: todo
  name: '@alego/tool-todo'
  config:
    allowParallelInProgress: true
"""


def _launch_args(mode: str) -> tuple[str, ...]:
    try:
        return resolve_bundled_launch_args(mode)
    except FileNotFoundError as exc:
        pytest.skip(f"bundled {mode}-mode runtime unavailable on this machine: {exc}")


def _client(tmp_path: Path, launch_args: tuple[str, ...]) -> HarnessClient:
    return HarnessClient(
        HarnessConfig(
            launch_args_override=launch_args,
            cwd=str(tmp_path),
            env={
                "ALEGO_CORDIS_CONFIG": "./cordis.yml",
                "ALEGO_SESSION_ROOT": str(tmp_path / "sessions"),
                "ALEGO_CWD": str(tmp_path),
                # The lazily mounted adapter requires a key even without a model call.
                "DEEPSEEK_API_KEY": "sk-dummy-for-boot",
                "DEEPSEEK_BASE_URL": "http://127.0.0.1:9",
            },
            request_timeout_seconds=120,
        )
    )


@pytest.mark.parametrize("mode", _MODES)
def test_bundled_runtime_boots_a_cordis_config(tmp_path: Path, mode: str) -> None:
    launch_args = _launch_args(mode)
    (tmp_path / "cordis.yml").write_text(_CORDIS_YML)

    with _client(tmp_path, launch_args) as client:
        init = client.initialize(provider="deepseek-official", cwd=str(tmp_path), model="deepseek-v4-pro")

    assert init.serverInfo is not None
    assert init.serverInfo.name == "alego-sdk-runtime"


@pytest.mark.parametrize("mode", _MODES)
def test_python_sdk_boots_minimal_jsonrpc_config(tmp_path: Path, mode: str) -> None:
    launch_args = _launch_args(mode)
    model = "minimal-environment-model"
    harness = Alego(
        model=model,
        cwd=str(tmp_path),
        session_root=str(tmp_path / "sessions"),
        cordis=str(_MINIMAL_CONFIG),
        env={
            "ALEGO_MODEL": model,
            "ALEGO_CONTEXT_WINDOW": "1000000",
            "ALEGO_SYSTEM_PROMPT": "You are the Python SDK minimal boot test agent.",
        },
        api_key="sk-dummy-for-boot",
        base_url="http://127.0.0.1:9",
        launch_args_override=launch_args,
        request_timeout_seconds=120,
    )

    with harness:
        pass


@pytest.mark.parametrize("mode", _MODES)
def test_bundled_runtime_surfaces_unbundled_plugin_failure(tmp_path: Path, mode: str) -> None:
    launch_args = _launch_args(mode)
    (tmp_path / "cordis.yml").write_text(
        "- id: missing\n  name: '@alego/does-not-exist'\n"
    )

    client = _client(tmp_path, launch_args)
    client.start()
    try:
        with pytest.raises((TransportClosedError, TimeoutError)) as excinfo:
            client.initialize(provider="deepseek-official", cwd=str(tmp_path), model="deepseek-v4-pro")
    finally:
        client.close()

    assert "@alego/does-not-exist" in str(excinfo.value)


@pytest.mark.parametrize("mode", _MODES)
@pytest.mark.parametrize("ambient_config", [None, ""], ids=["unset", "empty-counts-as-absent"])
def test_zero_config_run_injects_bundled_default_cordis_config(
    tmp_path: Path, mode: str, ambient_config: str | None, monkeypatch: pytest.MonkeyPatch
) -> None:
    _launch_args(mode)  # skip early when this carrier is unavailable
    monkeypatch.setenv("ALEGO_RUNTIME_MODE", mode)
    if ambient_config is None:
        monkeypatch.delenv("ALEGO_CORDIS_CONFIG", raising=False)
    else:
        monkeypatch.setenv("ALEGO_CORDIS_CONFIG", ambient_config)

    harness = Alego(
        model="deepseek-v4-pro",
        cwd=str(tmp_path),
        session_root=str(tmp_path / "sessions"),
        api_key="sk-dummy-for-boot",
        base_url="http://127.0.0.1:9",
        request_timeout_seconds=120,
    )
    with harness:
        pass

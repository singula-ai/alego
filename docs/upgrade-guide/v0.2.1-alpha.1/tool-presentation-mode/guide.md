---
kind: upgrade-guide
description: "Tool presentation accepts native or ptc; the mixed both mode is rejected."
---

# Select native or PTC tool presentation

English | [中文](guide.zh.md)

## Change

The `mode` fields of `@singula-ai/alego-tools` and `@singula-ai/alego-agent-tool-presentation` accept only `native` or `ptc`. The `both` value is rejected. This also affects `ALEGO_TOOLS_MODE=both`, which supplies the tools configuration through the shipped profile patches.

`native` exposes visible tools as direct function calls. `ptc` exposes `run_code`; programs call the visible tools through the generated SDK. Different agent presets can continue using different modes in the same application.

## Migration

1. In `cordis.yml`, profile `cordis.patch.yml`, or a custom overlay, replace `mode: both` with `mode: native` for direct calls or `mode: ptc` for program-based calls.
2. Replace `ALEGO_TOOLS_MODE=both` with `ALEGO_TOOLS_MODE=native` or `ALEGO_TOOLS_MODE=ptc`. For preset-specific selection, update the preset's `@singula-ai/alego-agent-tool-presentation` row instead.
3. Update code that calls `ctx.tools.presentAs('both')` to select `native` or `ptc`. In PTC programs, keep calls inside `run_code`; do not emit the SDK function names as direct model tool calls.
4. Start the affected profile and confirm that configuration loads. Native requests expose the permitted direct tools; PTC requests expose `run_code` and its SDK instructions.

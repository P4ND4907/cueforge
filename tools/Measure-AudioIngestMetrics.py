#!/usr/bin/env python3
"""Measure derived audio ingest metrics for CueForge QA gates.

This tool emits JSON only. It does not write raw samples into reports.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import pyloudnorm as pyln
import soundfile as sf


DEFAULT_LABELS = ["L", "R", "C", "LFE", "Ls", "Rs", "Lrs", "Rrs"]


def main() -> int:
    args = parse_args()
    metrics = measure_file(args.input, channel_label=args.channel_label)

    if args.output:
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf8")

    if args.json or not args.output:
        print(json.dumps(metrics, indent=2))

    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Measure CueForge audio ingest metrics.")
    parser.add_argument("--input", required=True, help="Audio file to measure.")
    parser.add_argument("--output", help="Optional JSON output path.")
    parser.add_argument("--channel-label", help="Override label for mono/channel-split inputs.")
    parser.add_argument("--json", action="store_true", help="Print JSON to stdout.")
    return parser.parse_args()


def measure_file(input_path: str, channel_label: str | None = None) -> dict[str, Any]:
    path = Path(input_path)
    data, sample_rate = sf.read(path, always_2d=True)
    if data.size == 0:
        raise ValueError(f"{input_path} contains no audio samples.")

    meter = pyln.Meter(sample_rate)
    channel_count = data.shape[1]
    labels = build_labels(channel_count, channel_label)

    channel_metrics = []
    for index in range(channel_count):
        channel = np.asarray(data[:, index], dtype=np.float64)
        channel_metrics.append(
            {
                "channel": labels[index],
                "integratedLufs": round(float(meter.integrated_loudness(channel)), 3),
                "rmsDbfs": round(dbfs(float(np.sqrt(np.mean(np.square(channel))))), 3),
                "truePeakDbfs": round(dbfs(float(np.max(np.abs(channel)))), 3),
                "silencePercent": round(float(np.mean(np.abs(channel) < 1e-5) * 100), 3),
            }
        )

    correlations = []
    if channel_count >= 2:
        for index in range(channel_count - 1):
            pair = f"{labels[index]}/{labels[index + 1]}"
            correlations.append(
                {
                    "pair": pair,
                    "value": round(correlation(data[:, index], data[:, index + 1]), 6),
                }
            )

    pattern_checks = []
    if channel_count >= 2:
        first_pair = correlations[0]["value"] if correlations else 0
        pattern_checks.append(
            {
                "id": "stereo-distinctness",
                "expected": "left and right channels are not identical",
                "actual": f"L/R correlation {first_pair}",
                "ok": abs(float(first_pair)) < 0.98,
            }
        )

    return {
        "schema": "cueforge.audio-ingest-metrics.v1",
        "input": str(path).replace("\\", "/"),
        "sampleRate": int(sample_rate),
        "channels": int(channel_count),
        "channelMetrics": channel_metrics,
        "correlations": correlations,
        "patternChecks": pattern_checks,
        "rawAudioStored": False,
        "boundary": "Derived metrics only. Raw audio samples are not serialized.",
    }


def build_labels(channel_count: int, channel_label: str | None) -> list[str]:
    if channel_count == 1 and channel_label:
        return [channel_label]
    return [DEFAULT_LABELS[index] if index < len(DEFAULT_LABELS) else f"ch{index + 1}" for index in range(channel_count)]


def dbfs(value: float) -> float:
    return 20 * math.log10(max(value, 1e-12))


def correlation(left: np.ndarray, right: np.ndarray) -> float:
    if np.max(np.abs(left)) <= 1e-12 or np.max(np.abs(right)) <= 1e-12:
        return 0.0
    matrix = np.corrcoef(left, right)
    value = float(matrix[0, 1])
    if math.isnan(value):
        return 0.0
    return value


if __name__ == "__main__":
    raise SystemExit(main())

# Route Graph Lab

Status: PASS
Generated: 2026-05-24T09:40:58.821Z

## Summary

- Source: desktop_bridge
- Nodes: 20
- Edges: 18
- Confidence: 76
- Inputs: 1
- Outputs: 16
- Companions: 5
- Risks: 3

| Check | Status | Detail |
| --- | --- | --- |
| windows-endpoint-evidence | PASS | 16 output node(s), 1 input node(s). |
| chain-graph-detected | PASS | 20 node(s), 18 edge(s), confidence 76. |
| autodetect-native-confidence | PASS | desktop_bridge, confidence 92. |
| safe-capability-boundary | PASS | Scanner reports evidence only and cannot modify system state. |

Boundary: raw Windows device IDs and paths are read only into a temporary local file. The committed artifact stores counts and confidence only.

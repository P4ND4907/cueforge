# Windows Probes

Small native probes for device, route, latency, and session evidence.

Each probe must:

- Return a versioned manifest or evidence packet.
- Avoid raw private identifiers in public exports.
- Stay read-only unless a future explicit action flow is approved.

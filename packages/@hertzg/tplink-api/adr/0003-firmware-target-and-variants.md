# ADR 0003 — Targets the EU/GDPR `cgi_gdpr` firmware family; firmware-variant support is an open design problem

**Status:** Accepted

## Context

"TP-Link router API" is not a single thing. Different model lines,
firmware versions, and regional variants expose subtly different
HTTP endpoints, payload formats, and authentication flows. The
encryption protocol (AES + RSA) and the action vocabulary
(`ACT.GET`, `LTE_BANDINFO`, …) are not formally specified — they
are reverse-engineered from each firmware's web UI.

This package was reverse-engineered against a specific firmware
family: the EU/GDPR builds that expose the `cgi_gdpr` POST
endpoint with the AES+RSA encryption flow used by the supported
models (TL-MR6400, Archer VR900v, TL-MR6500v, Archer MR600 v2,
and similar). Other variants — older firmware, region-specific
builds, and some newer 5G modems (e.g. NE200, see
[#82](https://github.com/hertzg/jsr-monorepo/issues/82)) — have
divergent enough behavior that the package's authentication or
execute flow does not work even when the same general AES+RSA
shape is present.

The right design for handling this divergence is unsettled.
Reasonable options include:

- Per-model adapter modules selected by the caller.
- Capability negotiation on connect (try one flow, fall back
  to another).
- Side-by-side packages, one per firmware family.
- A pluggable transport interface that callers implement for
  their model.

None of these has been chosen. The simplest path forward — and
the one this ADR records — is to be honest about the current
target and call out variant support as an open problem.

## Decision

- **Supported scope today: routers exposing the `cgi_gdpr`
  endpoint with the documented AES+RSA flow** and the action
  vocabulary used by the listed models.
- **Out of scope today: other firmware variants.** The package
  does not abstract over them and does not attempt to detect
  which variant it is talking to.
- **Action discovery is left to the user.** `mod.ts` documents
  the browser-console hook that logs the web UI's `RECV:` /
  `SEND:` payloads — this is the canonical way to discover
  `actionType` / `operationId` / `attributes` / `stack` /
  `pStack` for a given firmware.
- **Variant support is an open design problem.** Future work
  to support additional firmware families is welcome, but the
  shape of that support is not pre-decided. Issue #82 tracks
  the concrete request that surfaced the problem.

## Consequences

- **The supported-models list in `mod.ts` is the contract.**
  If your router is not on it (or close), the package may not
  work; fixing your model is potentially a meaningful project,
  not a one-line patch.
- **Adding model support without an architectural answer is
  risky.** A model-specific patch to `authenticate.ts` would
  pile conditional branches into the orchestrator. Better:
  resolve the variant-support shape first, then port models
  into it.
- **The package does not silently degrade across variants.**
  An unsupported router will fail authentication early, not
  return wrong data.
- **Breaking changes are likely once variant support lands.**
  The current single-flow `authenticate` / `execute` shape may
  need to take a model or capability identifier; that would be
  a major version bump under the repo's Conventional Commit
  rules.

## References

- `mod.ts` — supported-models list and action discovery snippet
- `authenticate.ts`, `execute.ts` — current single-firmware flow
- `client/fetchCgiGdpr.ts` — the GDPR endpoint binding
- Issue [#82](https://github.com/hertzg/jsr-monorepo/issues/82)
  — TP-LINK NE200 5G outdoor modem support

# ADR 0011 - A dependency version must be twelve hours old, in Bun and in Renovate

Bun won't install a version published less than twelve hours ago, and Renovate
won't propose one. The two settings carry the same window and change together.

```toml
# bunfig.toml
[install]
minimumReleaseAge = 43200
```

```jsonc
// renovate.json
"minimumReleaseAge": "12 hours"
```

Bun takes seconds, Renovate takes a phrase. Renovate's window must never be
shorter than Bun's. If it is, Renovate opens a PR for a version Bun filters
out, and every job on that PR goes red on a bump that is fine.

Twelve hours, not days: every upgrade is reviewed by a person before it merges,
and that review is the real soak time. Nothing checks that the two values
match. If they drift, the symptom is a red dependency PR that fails at install.

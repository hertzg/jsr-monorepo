# Triage Labels

The skills speak in terms of canonical triage roles. This file maps those roles
to the actual label strings used in this repo's issue tracker.

A triaged issue carries exactly one category label and one state label.

## Category

| Canonical role | Label in this repo | Meaning                    |
| -------------- | ------------------ | -------------------------- |
| `bug`          | `bug`              | Something is broken        |
| `enhancement`  | `enhancement`      | New feature or improvement |

## State

| Canonical role    | Label in this repo | Meaning                                  |
| ----------------- | ------------------ | ---------------------------------------- |
| `needs-triage`    | `needs-triage`     | Maintainer needs to evaluate this issue  |
| `needs-info`      | `needs-info`       | Waiting on reporter for more information |
| `ready-for-agent` | `ready-for-agent`  | Fully specified, ready for an AFK agent  |
| `ready-for-human` | `ready-for-human`  | Requires human implementation            |
| `wontfix`         | `wontfix`          | Will not be actioned                     |

All seven labels exist on GitHub. When a skill mentions a role (e.g. "apply the
AFK-ready triage label"), use the corresponding label string from this table.

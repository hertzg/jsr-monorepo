# ADR 0003 - Release Please versions and releases every package

Release Please owns version bumps, changelogs, tags and the release PR. Nothing
else writes a version.

```jsonc
// release-please-config.json
"packages/@hertzg/ip": {
  "release-type": "node",
  "package-name": "@hertzg/ip",
  "component": "@hertzg/ip"
}
```

It picks the packages a commit affects from the file paths the commit touched,
not from the commit scope. The commit type sets the bump: `feat` is minor,
`fix` is patch, `!` with a `BREAKING CHANGE:` footer is major, `chore` is none.
`release-type: node` means the bump is an edit to the package's `package.json`.

A commit that touches two packages releases both. A new package needs an entry
in `release-please-config.json` and `.release-please-manifest.json`. To force a
version, add a `Release-As: 1.0.0` footer.

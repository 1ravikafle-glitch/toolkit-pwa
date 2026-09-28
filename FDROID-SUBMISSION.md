# F-Droid Submission Guide — ToolKit

Maintainer contact: **ravikafle1444@gmail.com**
Package / Application ID: `com.ravikafle.toolkit`
License: MIT · Source: https://github.com/1ravikafle-glitch/toolkit-pwa

Everything F-Droid needs is already in this repository:

| Requirement | Status |
|---|---|
| FOSS license file | ✅ `LICENSE` (MIT) |
| Real, buildable source | ✅ Vite PWA + `android/` Gradle wrapper |
| Fastlane metadata in source repo | ✅ `fastlane/metadata/android/en-US/` |
| Release tag | ✅ `v1.0.0` (versionCode 1) |
| Changelog for the release | ✅ `fastlane/metadata/android/en-US/changelogs/1.txt` |
| No proprietary dependencies | ✅ none (no Firebase/GMS) |

Metadata layout (`fastlane/metadata/android/en-US/`):
`title.txt`, `short_description.txt`, `full_description.txt`,
`changelogs/1.txt`, `images/icon.png` (512), `images/featureGraphic.png` (1024×500),
`images/phoneScreenshots/1..7.png` (780×1688).

A locally built, signed APK (for sideloading/testing only — F-Droid always
builds and signs its own): `dist/ToolKit-v1.0.0.apk`
Keystore: `android/keystore/toolkit.jks` — **never committed; back it up**
(store/key password: `toolkit-release-2026`, alias `toolkit`).
Losing it means you can never ship an update under the same signature.

---

## How to submit (no fee, ~1 hour of your time)

### Step 1 — create a free GitLab account
Go to https://gitlab.com/users/sign_up and register with
ravikafle1444@gmail.com. F-Droid's infrastructure lives on GitLab.

### Step 2 — fork the app-store metadata repo
Fork https://gitlab.com/fdroid/fdroiddata to your GitLab account.

### Step 3 — add the build metadata file
In your fork, create a new branch (e.g. `com.ravikafle.toolkit`) and add this
exact file at `metadata/com.ravikafle.toolkit.yml`:

```yaml
Categories:
  - Utilities
License: MIT
AuthorName: Ravi Kafle
AuthorEmail: ravikafle1444@gmail.com
WebSite: https://1ravikafle-glitch.github.io/toolkit-pwa/
SourceCode: https://github.com/1ravikafle-glitch/toolkit-pwa
IssueTracker: https://github.com/1ravikafle-glitch/toolkit-pwa/issues

RepoType: git
Repo: https://github.com/1ravikafle-glitch/toolkit-pwa

Builds:
  - versionName: 1.0.0
    versionCode: 1
    commit: v1.0.0
    subdir: android/app
    sudo:
      - apt-get update
      - apt-get install -y npm
    build:
      - cd ../.. && npm install && npm run build
    gradle:
      - yes

AutoUpdateMode: Version v%v
UpdateCheckMode: Tags
CurrentVersion: 1.0.0
CurrentVersionCode: 1
```

How the build works on F-Droid's server: it checks out tag `v1.0.0`, runs the
`build:` steps (`npm install && npm run build` produces `dist/`), then runs
Gradle in `android/app`, whose `preBuild` task bundles `../dist` into the APK
assets. No keystore on the server ⇒ the APK comes out unsigned and F-Droid
signs it with its own key, as required.

### Step 4 — open the merge request
Open a merge request from your fork's branch to
https://gitlab.com/fdroid/fdroiddata/-/merge_requests with title
`Add com.ravikafle.toolkit`. Paste one line of context:

> New app submission: ToolKit, a FOSS (MIT) offline utility PWA packaged as a
> tiny WebView app (6 everyday tools, no ads, no trackers). Metadata and
> release tag v1.0.0 are in the source repo; author contact is
> ravikafle1444@gmail.com.

Volunteers review it (days to a few weeks). If they ask for changes, edit the
same file in your fork — the MR updates automatically.

### Step 5 — after approval
Nothing to do per release ever again: bump `versionName`/`versionCode` in
`android/app/build.gradle`, add
`fastlane/metadata/android/en-US/changelogs/<versionCode>.txt`, tag
`vX.Y.Z`, push — `AutoUpdateMode: Version v%v` makes F-Droid build and
publish it automatically.

---

## Optional extras (not required)

- **IzzyOnDroid repo** (much faster to get into): fill the form at
  https://izzyondroid.org/pages/submission — it can even serve your GitHub
  releases directly.
- Check https://f-droid.org/en/docs/ (Inclusion Policy, Build Metadata
  Reference) if reviewers request adjustments.

## Sideload the APK now (test before submitting)
Copy `dist/ToolKit-v1.0.0.apk` to an Android phone, tap it, allow
"install unknown apps" for your file manager. Requires Android 5.0+.

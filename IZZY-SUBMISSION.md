# IzzyOnDroid Submission Kit — ToolKit

IzzyOnDroid is a fast-moving F-Droid repo that serves the developer's own
signed APKs from GitHub releases — no build server, no waiting for a volunteer
packager. Package: `com.ravikafle.toolkit` · Contact: ravikafle1444@gmail.com

## Where we stand vs the Inclusion Policy

| Requirement | Status |
|---|---|
| OSI/FSF license, public repo | ✅ MIT, public GitHub |
| No trackers/ads/proprietary deps | ✅ none (no network calls at all in the app) |
| End-user app (not a library/demo) | ✅ |
| No self-updaters / binary downloads | ✅ |
| Unique packageName + displayName | ✅ `com.ravikafle.toolkit` / `ToolKit` |
| Fastlane metadata in repo | ✅ `fastlane/metadata/android/en-US/` (short+full desc, icon, featureGraphic, 7 screenshots) |
| Releases tagged, tag = versionName | ✅ `v1.0.0` |
| Signed APK attached to GitHub release, <30 MB | ✅ `ToolKit-v1.0.0.apk` (~289 KB), signed release key, not debuggable |
| No cleartext traffic flag | ✅ not set |
| Repo has proper description | ✅ set |

Checklist source: https://izzyondroid.org/docs/general/AppInclusionPolicy/

## ⚠️ Honest risk: the AI policy

IzzyOnDroid rejects "vibe-coded" apps: *"We are strongly opposed to apps which
are fully or in part created by generative AI tools… Vibe-coded apps will be
rejected."* It also allows use of LLMs for *"debugging, look-ups and comparable
read-only tasks"* and explicitly allows AI-generated text in README/docs, but
not in the app's code.

This project was developed with heavy AI assistance, including app code. The
policy's spirit — authorship and provenance of the shipped code — puts
ToolKit's eligibility genuinely in question. You know the truth of how you
built it better than any document can express. Options:

1. **Submit anyway, transparently.** An inclusion request opens a public
   issue; reviewers will ask. Honesty is required — any discovered lack of
   transparency degrades the outcome to *rejected*.
2. **Skip IzzyOnDroid.** The official F-Droid submission
   (see `FDROID-SUBMISSION.md`) has no AI policy and remains the primary
   target; IzzyOnDroid was a speed optimization, not a requirement.
3. **Wait.** Polish the codebase (or rewrite pieces) first if you want the
   strongest possible case.

## How to submit (if you choose to)

1. APK must be attached to the **latest** GitHub release — done
   (releases are scanned automatically).
2. Open an inclusion request issue at
   https://github.com/IzzyOnDroid/repo/issues — pick the *app inclusion request*
   template. Short pitch to paste:

   > **App:** ToolKit (`com.ravikafle.toolkit`)
   > **Source:** https://github.com/1ravikafle-glitch/toolkit-pwa
   > **License:** MIT · **APK:** attached to release v1.0.0 (~289 KB, signed)
   > Six everyday utilities (unit converter, tip & split, BMI, password
   > generator, word counter, QR codes) — fully offline, no ads, no trackers,
   > no network permission usage beyond WebView defaults. Fastlane metadata
   > (descriptions, icon, feature graphic, 7 screenshots) lives in the repo
   > under `fastlane/metadata/android/`. Contact: ravikafle1444@gmail.com

3. A volunteer picks the issue up: checks the repo, VirusTotal-scans and
   sideloads the APK, watches network traffic, then marks it approved.
   Turnaround is usually days.

Note: if ToolKit is accepted into the **official F-Droid repo first**, an
IzzyOnDroid listing becomes mostly redundant (Izzy typically then just mirrors
the official build) — worth mentioning that status in the issue.

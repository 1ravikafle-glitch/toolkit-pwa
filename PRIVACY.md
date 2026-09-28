# Privacy Policy — ToolKit

_ToolKit is free, open source software (MIT). Source:
https://github.com/1ravikafle-glitch/toolkit-pwa_

**ToolKit collects nothing. Transmits nothing. Stores nothing outside your device.**

## What the app does

- **No analytics, no ads, no trackers** — there is no analytics SDK, ad SDK or
  telemetry of any kind in the app.
- **No accounts** — nothing to sign up for, nothing to log in to.
- **No network calls by the app itself.** All six tools (unit converter,
  tip & split, BMI, password generator, word counter, QR codes) run entirely
  on your device. After the app is installed or first loaded, it works with
  no internet connection at all — airplane mode included.
- **No permissions beyond internet** — the Android app requests a single
  permission (`INTERNET`), needed only so the WebView can render the bundled
  app and open external links you tap (e.g. a URL you encoded into a QR code).

## What stays on your device

Some tools let you *optionally* save data for convenience. This data is stored
only in your browser's/app's local storage on your device and never leaves it:

- **Saved passwords** (Password Generator) — a private list of where you used
  each password.
- **QR history** and saved **Wi-Fi join records** (QR Codes).
- **Settings** — theme (light/dark/system) and text size.

Clearing the app's storage / browser data permanently deletes all of it.

## Web version

The web app is served as static files from GitHub Pages
(`1ravikafle-glitch.github.io`). GitHub's own infrastructure may see standard
web request metadata (IP address, user agent) when you load or update the app
— see [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
The app itself makes no requests beyond loading its own files; the service
worker caches them so repeat visits need no network.

## Camera

The QR *scan* feature uses your camera only while the scanner is open, only on
your request, and the video feed never leaves your device. Scanning happens
in-browser. (In some desktop browsers camera scanning is unavailable —
generation and Wi-Fi codes still work.)

## Changes

Any change to this policy will be noted in the release notes of the version
that introduces it.

## Contact

ravikafle1444@gmail.com

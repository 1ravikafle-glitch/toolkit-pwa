#!/usr/bin/env bash
# ToolKit release automation.
#
#   ./scripts/release.sh 1.2.3
#
# Steps:
#   1. verify clean tree on main, up to date with origin
#   2. bump android/app/build.gradle versionName/versionCode + package.json version
#   3. write fastlane changelog for the new versionCode
#   4. npm run typecheck && npm run build
#   5. build + sign the APK (requires a local Android SDK; see android/)
#   6. copy APK to dist/ and commit
#   7. tag v<version> and push
#   8. create the GitHub release with the APK attached
#
# Optional environment overrides:
#   JAVA_HOME, ANDROID_HOME, GRADLE  (auto-detected under .toolchain/ by default)
set -euo pipefail

VERSION="${1:-}"
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "usage: $0 <version>   e.g. $0 1.1.0" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
APP_GRADLE="android/app/build.gradle"
TAG="v$VERSION"
VERSION_CODE="$(( $(echo "$VERSION" | cut -d. -f1) * 10000 + $(echo "$VERSION" | cut -d. -f2) * 100 + $(echo "$VERSION" | cut -d. -f3) ))"

echo "==> Releasing $VERSION (versionCode $VERSION_CODE)"

# --- 1. sanity checks -------------------------------------------------------
[[ "$(git branch --show-current)" == "main" ]] || { echo "not on main" >&2; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "working tree not clean" >&2; exit 1; }
git fetch origin main --quiet 2>/dev/null || true
[[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/main 2>/dev/null || echo)" ]] || {
  echo "main is not up to date with origin/main — push/pull first" >&2
  exit 1
}
git rev-parse -q --verify "refs/tags/$TAG" >/dev/null && { echo "tag $TAG already exists" >&2; exit 1; }

# --- 2. bump versions -------------------------------------------------------
sed -i "s/versionCode [0-9]\+/versionCode $VERSION_CODE/" "$APP_GRADLE"
sed -i "s/versionName '[^']*'/versionName '$VERSION'/" "$APP_GRADLE"
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" package.json
echo "==> bumped $APP_GRADLE and package.json to $VERSION ($VERSION_CODE)"

# --- 3. changelog -----------------------------------------------------------
CHANGELOG="fastlane/metadata/android/en-US/changelogs/$VERSION_CODE.txt"
if [[ ! -f "$CHANGELOG" ]]; then
  echo "Write the changelog for versionCode $VERSION_CODE (max 500 chars)." >&2
  "${EDITOR:-vi}" "$CHANGELOG"
  [[ -f "$CHANGELOG" ]] || { echo "missing $CHANGELOG" >&2; exit 1; }
fi

# --- 4. web build -----------------------------------------------------------
command -v npm >/dev/null || { echo "npm not found" >&2; exit 1; }
npm install --no-audit --no-fund >/dev/null
npm run typecheck
npm run build

# --- 5. APK build -----------------------------------------------------------
: "${JAVA_HOME:=$(echo "$ROOT"/.toolchain/jdk-*)}"
: "${ANDROID_HOME:=$ROOT/.toolchain/sdk}"
export JAVA_HOME ANDROID_HOME
GRADLE="${GRADLE:-$(echo "$ROOT"/.toolchain/gradle-*/bin/gradle)}"
if [[ ! -x "$GRADLE" ]]; then GRADLE="$ROOT/android/gradlew"; fi
( cd "$ROOT/android" && "$GRADLE" assembleRelease --no-daemon )
APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
[[ -f "$APK" ]] || { echo "APK not produced" >&2; exit 1; }
cp "$APK" "$ROOT/dist/ToolKit-$VERSION.apk"
echo "==> $(du -h "$ROOT/dist/ToolKit-$VERSION.apk" | cut -f1) ToolKit-$VERSION.apk"

# --- 6. commit --------------------------------------------------------------
git add package.json package-lock.json "$APP_GRADLE" fastlane
git commit -q -m "Release $VERSION (versionCode $VERSION_CODE)"

# --- 7. tag + push ----------------------------------------------------------
git tag -a "$TAG" -m "ToolKit $VERSION"
git push origin main "$TAG" || {
  echo "push failed (flaky network?) — fix and run:" >&2
  echo "  git push origin main $TAG" >&2
  exit 1
}
echo "PUSH-OK: $(git rev-parse HEAD) == $(git ls-remote origin refs/heads/main | cut -f1)"

# --- 8. GitHub release ------------------------------------------------------
n=0
until gh release create "$TAG" --title "ToolKit $VERSION" \
    --notes "ToolKit $VERSION — see changelog in the app listing.

- **ToolKit-$VERSION.apk** — sideload (Android 5.0+), self-signed build for testing
- Web (PWA): https://1ravikafle-glitch.github.io/toolkit-pwa/" \
    "dist/ToolKit-$VERSION.apk"; do
  n=$((n+1)); [[ $n -ge 5 ]] && { echo "gh release create failed" >&2; exit 1; }
  sleep 4
done
echo "==> released: https://github.com/1ravikafle-glitch/toolkit-pwa/releases/tag/$TAG"
echo "Next: F-Droid picks this up automatically via AutoUpdateMode (Tags)."

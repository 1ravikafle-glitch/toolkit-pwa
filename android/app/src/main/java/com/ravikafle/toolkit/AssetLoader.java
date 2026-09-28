package com.ravikafle.toolkit;

import android.content.Context;
import android.webkit.WebResourceResponse;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * Serves the bundled web app from the APK's assets over the
 * https://appassets.androidplatform.net origin (the same origin the official
 * androidx WebViewAssetLoader uses). A regular https origin keeps ES module
 * imports, dynamic imports and the service worker working, which
 * file:///android_asset/ URLs cannot do.
 */
final class AssetLoader {

    /** Prefix of every URL we own; anything else is left to the WebView. */
    private static final String URL_PREFIX = "/web";
    /** Asset folder the Vite build is copied into (see app/build.gradle). */
    private static final String ASSET_ROOT = "web";

    private static final Map<String, String> MIME_TYPES = new HashMap<>();

    static {
        MIME_TYPES.put("html", "text/html");
        MIME_TYPES.put("htm", "text/html");
        MIME_TYPES.put("js", "text/javascript");
        MIME_TYPES.put("mjs", "text/javascript");
        MIME_TYPES.put("css", "text/css");
        MIME_TYPES.put("json", "application/json");
        MIME_TYPES.put("webmanifest", "application/manifest+json");
        MIME_TYPES.put("txt", "text/plain");
        MIME_TYPES.put("png", "image/png");
        MIME_TYPES.put("jpg", "image/jpeg");
        MIME_TYPES.put("jpeg", "image/jpeg");
        MIME_TYPES.put("gif", "image/gif");
        MIME_TYPES.put("svg", "image/svg+xml");
        MIME_TYPES.put("ico", "image/x-icon");
        MIME_TYPES.put("webp", "image/webp");
        MIME_TYPES.put("woff", "font/woff");
        MIME_TYPES.put("woff2", "font/woff2");
        MIME_TYPES.put("ttf", "font/ttf");
        MIME_TYPES.put("wasm", "application/wasm");
        MIME_TYPES.put("xml", "application/xml");
    }

    private AssetLoader() {
    }

    /**
     * @param path request path, e.g. {@code /web/assets/main-abc.js}
     * @return a response for bundled assets, or {@code null} when the URL is
     * not ours (the WebView then falls back to its normal handling).
     */
    static WebResourceResponse load(Context context, String path) {
        if (path == null || path.isEmpty()) {
            return null;
        }

        String clean = path.split("[?#]")[0];
        if (clean.equals("/") || clean.equals(URL_PREFIX) || clean.equals(URL_PREFIX + "/")) {
            clean = URL_PREFIX + "/index.html";
        }
        if (!clean.startsWith(URL_PREFIX + "/")) {
            return null;
        }

        String assetPath = ASSET_ROOT + clean.substring(URL_PREFIX.length());
        InputStream stream;
        try {
            stream = context.getAssets().open(assetPath);
        } catch (IOException missing) {
            return errorResponse(404, "Not Found");
        }
        return new WebResourceResponse(
                mimeTypeFor(assetPath),
                "UTF-8",
                200,
                "OK",
                Collections.<String, String>emptyMap(),
                stream);
    }

    private static WebResourceResponse errorResponse(int code, String reason) {
        return new WebResourceResponse(
                "text/plain",
                "UTF-8",
                code,
                reason,
                Collections.<String, String>emptyMap(),
                new ByteArrayInputStream(new byte[0]));
    }

    private static String mimeTypeFor(String path) {
        int dot = path.lastIndexOf('.');
        if (dot >= 0) {
            String ext = path.substring(dot + 1).toLowerCase(java.util.Locale.ROOT);
            String mime = MIME_TYPES.get(ext);
            if (mime != null) {
                return mime;
            }
        }
        return "application/octet-stream";
    }
}

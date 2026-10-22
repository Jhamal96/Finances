package org.ajdapp.householdfinance;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceError;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.ValueCallback;

public final class MainActivity extends Activity {
    private static final String FINANCE_URL = "https://finances.jhamal16.workers.dev/";
    private WebView browser;
    private ProgressBar progress;
    private ValueCallback<Uri[]> pendingUpload;
    private static final int FILE_PICK_REQUEST = 1001;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(9, 18, 34));
        getWindow().setNavigationBarColor(Color.rgb(9, 18, 34));
        FrameLayout shell = new FrameLayout(this);
        shell.setBackgroundColor(Color.rgb(11, 19, 35));
        browser = new WebView(this);
        shell.addView(browser, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        FrameLayout.LayoutParams bar = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(3));
        bar.gravity = android.view.Gravity.TOP;
        shell.addView(progress, bar);
        setContentView(shell);

        WebSettings settings = browser.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true); // Supabase login session and finance local cache
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // system file-picker URI
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setUserAgentString(settings.getUserAgentString() + " HouseholdFinanceAndroid/1.0");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(browser, false);

        browser.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri uri = request.getUrl();
                if (isTrusted(uri)) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                catch (Exception err) {
                    Toast.makeText(MainActivity.this, "Cannot open that link", Toast.LENGTH_SHORT).show();
                }
                return true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    Toast.makeText(MainActivity.this, "Internet connection required for Finance sync", Toast.LENGTH_LONG).show();
                }
            }
        });
        browser.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int newProgress) {
                progress.setProgress(newProgress);
                progress.setVisibility(newProgress < 100 ? View.VISIBLE : View.GONE);
            }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                                         FileChooserParams params) {
                if (pendingUpload != null) pendingUpload.onReceiveValue(null);
                pendingUpload = callback;
                try {
                    Intent request = params.createIntent();
                    startActivityForResult(request, FILE_PICK_REQUEST);
                    return true;
                } catch (Exception err) {
                    pendingUpload = null;
                    callback.onReceiveValue(null);
                    Toast.makeText(MainActivity.this, "No file picker available", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });
        // Regular HTTP downloads open externally. Android WebView does not natively download
        // browser blob: URLs. Use the installed PWA in Chrome for complete JSON exports.
        browser.setDownloadListener((url, userAgent, disposition, mime, size) -> {
            if (url.startsWith("blob:")) {
                Toast.makeText(this,
                        "For JSON/CSV downloads, open Finance in Chrome", Toast.LENGTH_LONG).show();
                return;
            }
            try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
            catch (Exception err) {
                Toast.makeText(this, "Cannot download this file", Toast.LENGTH_SHORT).show();
            }
        });
        if (state != null) browser.restoreState(state);
        else browser.loadUrl(FINANCE_URL);
    }

    private boolean isTrusted(Uri uri) {
        String scheme = uri.getScheme(), host = uri.getHost();
        return "https".equalsIgnoreCase(scheme)
            && ("finances.jhamal16.workers.dev".equalsIgnoreCase(host)
                || "vxpufrahrnwmtgltjstd.supabase.co".equalsIgnoreCase(host));
    }
    private int dp(int v) { return (int) (v * getResources().getDisplayMetrics().density + .5f); }
    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_PICK_REQUEST && pendingUpload != null) {
            pendingUpload.onReceiveValue(
                WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            pendingUpload = null;
        }
    }
    @Override public void onBackPressed() {
        if (browser != null && browser.canGoBack()) browser.goBack();
        else super.onBackPressed();
    }
    @Override protected void onSaveInstanceState(Bundle out) {
        if (browser != null) browser.saveState(out);
        super.onSaveInstanceState(out);
    }
    @Override protected void onDestroy() {
        if (browser != null) {
            browser.stopLoading();
            browser.destroy();
            browser = null;
        }
        super.onDestroy();
    }
}

package com.shadowrend.ads;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;

import androidx.annotation.NonNull;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.RequestConfiguration;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.ump.ConsentDebugSettings;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

import org.godotengine.godot.Godot;
import org.godotengine.godot.plugin.GodotPlugin;
import org.godotengine.godot.plugin.SignalInfo;
import org.godotengine.godot.plugin.UsedByGodot;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Shadowrend AdMob köprüsü: yalnız ÖDÜLLÜ reklam + Google onay formu (UMP / GDPR).
 *
 * Akış: init() → onay bilgisi güncellenir, gerekiyorsa onay formu gösterilir → reklam isteği
 * yapılabiliyorsa MobileAds başlatılır ("ready" sinyali). load(unit) → "loaded"/"load_failed";
 * show(unit) → ödül kazanılırsa "rewarded", reklam kapanınca "closed" (ödül yoksa yalnız closed).
 * Tüm sinyaller Godot iş parçacığında yayılır.
 */
public class ShadowAds extends GodotPlugin {
    private static final String TAG = "ShadowAds";

    private final Map<String, RewardedAd> ads = new HashMap<>();
    private final Set<String> loading = new HashSet<>();
    private final AtomicBoolean started = new AtomicBoolean(false);
    private ConsentInformation consent;
    private boolean ready = false;

    // ── Donma tanısı: Android arayüz (UI) iş parçacığı bekçisi ──
    // Godot ana döngüsü ayrı iş parçacığında koşar; dokunmalar ise UI iş parçacığından gelir.
    // UI iş parçacığı kilitlenirse oyun çizilmeye devam eder ama hiçbir dokunuş işlenmez.
    // Bekçi her 250 ms UI'ya nabız yollar; 2 sn'den uzun gecikmede UI'nın o anki yığınını kaydeder.
    private static final long UI_STALL_MS = 2000;
    private final Handler uiHandler = new Handler(Looper.getMainLooper());
    private volatile long uiBeat = SystemClock.uptimeMillis();
    private final ArrayList<String> stalls = new ArrayList<>();
    private volatile String lastOp = "-";
    private volatile long lastOpAt = 0;
    private volatile Thread godotThread = null;

    public ShadowAds(Godot godot) {
        super(godot);
        startUiWatch();
    }

    private void op(String name) {
        lastOp = name;
        lastOpAt = SystemClock.uptimeMillis();
    }

    private static String stack(Thread t, int n) {
        if (t == null) return "?";
        StackTraceElement[] st = t.getStackTrace();
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < st.length && i < n; i++) {
            StackTraceElement e = st[i];
            String c = e.getClassName();
            int dot = c.lastIndexOf('.');
            b.append(i == 0 ? "" : " < ").append(dot >= 0 ? c.substring(dot + 1) : c).append('.').append(e.getMethodName());
        }
        return b.toString();
    }

    private void startUiWatch() {
        final Runnable pulse = () -> uiBeat = SystemClock.uptimeMillis();
        Thread w = new Thread(() -> {
            long stallStart = 0;
            String trace = "";
            while (true) {
                try { Thread.sleep(250); } catch (InterruptedException e) { return; }
                long now = SystemClock.uptimeMillis();
                long gap = now - uiBeat;
                if (gap >= UI_STALL_MS) {
                    if (stallStart == 0) {
                        stallStart = uiBeat;
                        trace = stack(Looper.getMainLooper().getThread(), 9);
                    }
                } else if (stallStart != 0) {
                    long dur = uiBeat - stallStart;
                    long ago = (now - lastOpAt) / 1000;
                    String rec = "UI-DONMA " + (dur / 100) / 10.0 + " sn · son işlem: " + lastOp + " (" + ago + " sn önce) · yığın: " + trace;
                    Log.w(TAG, rec);
                    synchronized (stalls) {
                        stalls.add(rec);
                        while (stalls.size() > 8) stalls.remove(0);
                    }
                    stallStart = 0;
                }
                uiHandler.post(pulse);
            }
        }, "ShadowUiWatch");
        w.setDaemon(true);
        w.setPriority(Thread.MIN_PRIORITY);
        w.start();
    }

    /** bu oturumdaki UI iş parçacığı donmaları (tanı raporu için) */
    @UsedByGodot
    public String ui_stalls() {
        synchronized (stalls) {
            return String.join("\n", stalls);
        }
    }

    /** Godot ana döngüsünün iş parçacığını işaretle (Godot iş parçacığından bir kez çağrılır) */
    @UsedByGodot
    public void mark_godot_thread() {
        godotThread = Thread.currentThread();
    }

    /** Godot döngüsü takıldığında o iş parçacığının Java yığını (yerel kısım görünmez) */
    @UsedByGodot
    public String godot_stack() {
        return stack(godotThread, 9) + " · UI nabız " + (SystemClock.uptimeMillis() - uiBeat) + " ms önce · son işlem: " + lastOp;
    }

    @NonNull
    @Override
    public String getPluginName() {
        return "ShadowAds";
    }

    @NonNull
    @Override
    public Set<SignalInfo> getPluginSignals() {
        return new HashSet<>(Arrays.asList(
                new SignalInfo("ready"),
                new SignalInfo("loaded", String.class),
                new SignalInfo("load_failed", String.class, String.class),
                new SignalInfo("rewarded", String.class),
                new SignalInfo("closed", String.class),
                new SignalInfo("show_failed", String.class, String.class)
        ));
    }

    private void emit(final String name, final Object... args) {
        runOnRenderThread(() -> emitSignal(name, args));
    }

    /** test: true → Google'ın test reklamları/test cihazı; testDevice: logcat'teki cihaz kimliği (boş olabilir) */
    @UsedByGodot
    public void init(final boolean test, final String testDevice) {
        final Activity act = getActivity();
        if (act == null) return;
        op("init");
        act.runOnUiThread(() -> {
            op("consent");
            ConsentRequestParameters.Builder pb = new ConsentRequestParameters.Builder().setTagForUnderAgeOfConsent(false);
            if (test && testDevice != null && !testDevice.isEmpty()) {
                pb.setConsentDebugSettings(new ConsentDebugSettings.Builder(act).addTestDeviceHashedId(testDevice).build());
            }
            consent = UserMessagingPlatform.getConsentInformation(act);
            consent.requestConsentInfoUpdate(act, pb.build(),
                    () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(act, err -> {
                        if (err != null) Log.w(TAG, "consent form: " + err.getMessage());
                        startAds(act, test, testDevice);
                    }),
                    err -> {
                        Log.w(TAG, "consent info: " + err.getMessage());
                        startAds(act, test, testDevice);
                    });
            // önceki oturumdan onay varsa beklemeden başla
            if (consent.canRequestAds()) startAds(act, test, testDevice);
        });
    }

    private void startAds(Activity act, boolean test, String testDevice) {
        if (consent != null && !consent.canRequestAds()) return;
        if (!started.compareAndSet(false, true)) return;
        if (test && testDevice != null && !testDevice.isEmpty()) {
            MobileAds.setRequestConfiguration(new RequestConfiguration.Builder()
                    .setTestDeviceIds(Arrays.asList(testDevice)).build());
        }
        op("mobileads-init");
        new Thread(() -> MobileAds.initialize(act, status -> {
            ready = true;
            emit("ready");
        })).start();
    }

    @UsedByGodot
    public boolean is_ready() {
        return ready;
    }

    @UsedByGodot
    public void load(final String unit) {
        final Activity act = getActivity();
        if (act == null || !ready) return;
        act.runOnUiThread(() -> {
            if (ads.containsKey(unit) || loading.contains(unit)) return;
            loading.add(unit);
            op("ad-load");
            RewardedAd.load(act, unit, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
                @Override
                public void onAdLoaded(@NonNull RewardedAd ad) {
                    loading.remove(unit);
                    ads.put(unit, ad);
                    emit("loaded", unit);
                }

                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError e) {
                    loading.remove(unit);
                    emit("load_failed", unit, e.getCode() + " " + e.getMessage());
                }
            });
        });
    }

    @UsedByGodot
    public boolean is_loaded(String unit) {
        return ads.containsKey(unit);
    }

    @UsedByGodot
    public void show(final String unit) {
        final Activity act = getActivity();
        if (act == null) return;
        act.runOnUiThread(() -> {
            op("ad-show");
            RewardedAd ad = ads.remove(unit);
            if (ad == null) {
                emit("show_failed", unit, "not loaded");
                return;
            }
            ad.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override
                public void onAdDismissedFullScreenContent() {
                    emit("closed", unit);
                }

                @Override
                public void onAdFailedToShowFullScreenContent(@NonNull AdError e) {
                    emit("show_failed", unit, e.getCode() + " " + e.getMessage());
                }
            });
            ad.show(act, item -> emit("rewarded", unit));
        });
    }

    /** ayarlarda "gizlilik seçenekleri" gerekli mi (AB kullanıcıları) */
    @UsedByGodot
    public boolean privacy_required() {
        return consent != null && consent.getPrivacyOptionsRequirementStatus()
                == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
    }

    @UsedByGodot
    public void show_privacy() {
        final Activity act = getActivity();
        if (act == null) return;
        act.runOnUiThread(() -> UserMessagingPlatform.showPrivacyOptionsForm(act, err -> {
            if (err != null) Log.w(TAG, "privacy form: " + err.getMessage());
        }));
    }
}

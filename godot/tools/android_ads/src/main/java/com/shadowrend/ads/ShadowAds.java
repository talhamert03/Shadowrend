package com.shadowrend.ads;

import android.app.Activity;
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

    public ShadowAds(Godot godot) {
        super(godot);
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
        act.runOnUiThread(() -> {
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

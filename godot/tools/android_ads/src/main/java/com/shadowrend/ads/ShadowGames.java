package com.shadowrend.ads;

import android.app.Activity;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.NonNull;

import com.google.android.gms.games.GamesSignInClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.android.gms.games.SnapshotsClient;
import com.google.android.gms.games.snapshot.Snapshot;
import com.google.android.gms.games.snapshot.SnapshotMetadataChange;

import org.godotengine.godot.Godot;
import org.godotengine.godot.plugin.GodotPlugin;
import org.godotengine.godot.plugin.SignalInfo;
import org.godotengine.godot.plugin.UsedByGodot;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Shadowrend Google Play Games Services v2 köprüsü: oyuncu girişi (Google hesabı) + bulut kaydı
 * (Saved Games / Snapshots). Play Console'daki oyun projesinin kimliği manifestte
 * com.google.android.gms.games.APP_ID olarak yoksa hiçbir şey yapmaz (çökmez).
 *
 * Sinyaller: signed_in(bool ok, String playerId, String name) · cloud_loaded(bool ok, String data)
 *            cloud_saved(bool ok)
 */
public class ShadowGames extends GodotPlugin {
    private static final String TAG = "ShadowGames";
    private static final String SLOT = "shadowrend_main";
    private boolean ready = false;

    public ShadowGames(Godot godot) {
        super(godot);
    }

    @NonNull
    @Override
    public String getPluginName() {
        return "ShadowGames";
    }

    @NonNull
    @Override
    public Set<SignalInfo> getPluginSignals() {
        return new HashSet<>(Arrays.asList(
                new SignalInfo("signed_in", Boolean.class, String.class, String.class),
                new SignalInfo("cloud_loaded", Boolean.class, String.class),
                new SignalInfo("cloud_saved", Boolean.class)
        ));
    }

    private void emit(final String name, final Object... args) {
        runOnRenderThread(() -> emitSignal(name, args));
    }

    private boolean hasAppId(Activity a) {
        try {
            ApplicationInfo ai = a.getPackageManager().getApplicationInfo(a.getPackageName(), PackageManager.GET_META_DATA);
            Bundle md = ai.metaData;
            return md != null && md.get("com.google.android.gms.games.APP_ID") != null;
        } catch (Exception e) {
            return false;
        }
    }

    /** SDK'yı başlatır ve sessiz (otomatik) girişi dener; sonuç → signed_in */
    @UsedByGodot
    public void init() {
        final Activity a = getActivity();
        if (a == null) return;
        a.runOnUiThread(() -> {
            try {
                if (!hasAppId(a)) {
                    Log.w(TAG, "APP_ID yok — Play Games kapalı");
                    emit("signed_in", false, "", "");
                    return;
                }
                if (!ready) {
                    PlayGamesSdk.initialize(a);
                    ready = true;
                }
                GamesSignInClient c = PlayGames.getGamesSignInClient(a);
                c.isAuthenticated().addOnCompleteListener(t -> {
                    boolean ok = t.isSuccessful() && t.getResult() != null && t.getResult().isAuthenticated();
                    if (ok) fetchPlayer(a); else emit("signed_in", false, "", "");
                });
            } catch (Throwable e) {
                Log.e(TAG, "init", e);
                emit("signed_in", false, "", "");
            }
        });
    }

    /** Kullanıcı düğmeye bastığında elle giriş (Google hesap seçimi) */
    @UsedByGodot
    public void sign_in() {
        final Activity a = getActivity();
        if (a == null || !ready) { emit("signed_in", false, "", ""); return; }
        a.runOnUiThread(() -> {
            try {
                PlayGames.getGamesSignInClient(a).signIn().addOnCompleteListener(t -> {
                    boolean ok = t.isSuccessful() && t.getResult() != null && t.getResult().isAuthenticated();
                    if (ok) fetchPlayer(a); else emit("signed_in", false, "", "");
                });
            } catch (Throwable e) {
                Log.e(TAG, "sign_in", e);
                emit("signed_in", false, "", "");
            }
        });
    }

    private void fetchPlayer(Activity a) {
        PlayGames.getPlayersClient(a).getCurrentPlayer().addOnCompleteListener(t -> {
            if (t.isSuccessful() && t.getResult() != null) {
                emit("signed_in", true, t.getResult().getPlayerId(), t.getResult().getDisplayName());
            } else {
                emit("signed_in", true, "", "");
            }
        });
    }

    /** Bulut kaydını oku → cloud_loaded(ok, json) (kayıt yoksa ok=true, data="") */
    @UsedByGodot
    public void load_cloud() {
        final Activity a = getActivity();
        if (a == null || !ready) { emit("cloud_loaded", false, ""); return; }
        try {
            SnapshotsClient sc = PlayGames.getSnapshotsClient(a);
            sc.open(SLOT, true, SnapshotsClient.RESOLUTION_POLICY_MOST_RECENTLY_MODIFIED).addOnCompleteListener(t -> {
                try {
                    if (!t.isSuccessful() || t.getResult() == null || t.getResult().getData() == null) {
                        emit("cloud_loaded", false, "");
                        return;
                    }
                    Snapshot s = t.getResult().getData();
                    byte[] b = s.getSnapshotContents().readFully();
                    sc.discardAndClose(s);
                    emit("cloud_loaded", true, b == null ? "" : new String(b, StandardCharsets.UTF_8));
                } catch (Throwable e) {
                    Log.e(TAG, "load", e);
                    emit("cloud_loaded", false, "");
                }
            });
        } catch (Throwable e) {
            Log.e(TAG, "load_cloud", e);
            emit("cloud_loaded", false, "");
        }
    }

    /** Bulut kaydına yaz (tüm oyuncu verisi JSON) → cloud_saved(ok) */
    @UsedByGodot
    public void save_cloud(final String data, final String desc) {
        final Activity a = getActivity();
        if (a == null || !ready) { emit("cloud_saved", false); return; }
        try {
            SnapshotsClient sc = PlayGames.getSnapshotsClient(a);
            sc.open(SLOT, true, SnapshotsClient.RESOLUTION_POLICY_MOST_RECENTLY_MODIFIED).addOnCompleteListener(t -> {
                try {
                    if (!t.isSuccessful() || t.getResult() == null || t.getResult().getData() == null) {
                        emit("cloud_saved", false);
                        return;
                    }
                    Snapshot s = t.getResult().getData();
                    s.getSnapshotContents().writeBytes(data.getBytes(StandardCharsets.UTF_8));
                    SnapshotMetadataChange ch = new SnapshotMetadataChange.Builder().setDescription(desc).build();
                    sc.commitAndClose(s, ch).addOnCompleteListener(t2 -> emit("cloud_saved", t2.isSuccessful()));
                } catch (Throwable e) {
                    Log.e(TAG, "save", e);
                    emit("cloud_saved", false);
                }
            });
        } catch (Throwable e) {
            Log.e(TAG, "save_cloud", e);
            emit("cloud_saved", false);
        }
    }
}

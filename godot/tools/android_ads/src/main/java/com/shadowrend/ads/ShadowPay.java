package com.shadowrend.ads;

import android.app.Activity;
import android.util.Log;

import androidx.annotation.NonNull;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import org.godotengine.godot.Godot;
import org.godotengine.godot.plugin.GodotPlugin;
import org.godotengine.godot.plugin.SignalInfo;
import org.godotengine.godot.plugin.UsedByGodot;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Shadowrend Google Play Billing köprüsü: yalnız tüketilebilir uygulama içi ürünler (gem paketleri).
 *
 * Akış: start(ids) → bağlanır, ürün fiyatları "price"(id, yerel fiyat) ile gelir, yarım kalmış
 * satın almalar "purchased" ile yeniden bildirilir. buy(id) → Play ödeme ekranı; ödeme tamamlanınca
 * "purchased"(id, token). Oyun ödülü verip kaydettikten SONRA consume(token) çağırır → "consumed".
 * İptal/hata → "purchase_failed"(id, kod, mesaj); bekleyen ödeme → "pending"(id).
 */
public class ShadowPay extends GodotPlugin implements PurchasesUpdatedListener {
    private static final String TAG = "ShadowPay";

    private BillingClient client;
    private final Map<String, ProductDetails> details = new ConcurrentHashMap<>();
    private final Set<String> notified = Collections.synchronizedSet(new HashSet<>());
    private List<String> ids = new ArrayList<>();
    private String buying = "";
    private boolean connecting = false;

    public ShadowPay(Godot godot) {
        super(godot);
    }

    @NonNull
    @Override
    public String getPluginName() {
        return "ShadowPay";
    }

    @NonNull
    @Override
    public Set<SignalInfo> getPluginSignals() {
        return new HashSet<>(Arrays.asList(
                new SignalInfo("connected"),
                new SignalInfo("price", String.class, String.class),
                new SignalInfo("purchased", String.class, String.class),
                new SignalInfo("consumed", String.class),
                new SignalInfo("pending", String.class),
                new SignalInfo("purchase_failed", String.class, Integer.class, String.class)
        ));
    }

    private void emit(final String name, final Object... args) {
        runOnRenderThread(() -> emitSignal(name, args));
    }

    @UsedByGodot
    public void start(final String[] productIds) {
        ids = new ArrayList<>(Arrays.asList(productIds));
        final Activity act = getActivity();
        if (act == null) return;
        if (client == null) {
            client = BillingClient.newBuilder(act)
                    .setListener(this)
                    .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                    .build();
        }
        connect();
    }

    private void connect() {
        if (client == null || client.isReady() || connecting) return;
        connecting = true;
        client.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult r) {
                connecting = false;
                if (r.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    Log.w(TAG, "setup: " + r.getResponseCode() + " " + r.getDebugMessage());
                    return;
                }
                emit("connected");
                queryProducts();
                restore();
            }

            @Override
            public void onBillingServiceDisconnected() {
                connecting = false;
            }
        });
    }

    private void queryProducts() {
        if (ids.isEmpty()) return;
        List<QueryProductDetailsParams.Product> list = new ArrayList<>();
        for (String id : ids) {
            list.add(QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(id).setProductType(BillingClient.ProductType.INAPP).build());
        }
        client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(list).build(),
                (r, result) -> {
                    if (r.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        Log.w(TAG, "products: " + r.getResponseCode() + " " + r.getDebugMessage());
                        return;
                    }
                    for (ProductDetails pd : result.getProductDetailsList()) {
                        details.put(pd.getProductId(), pd);
                        ProductDetails.OneTimePurchaseOfferDetails o = pd.getOneTimePurchaseOfferDetails();
                        if (o != null) emit("price", pd.getProductId(), o.getFormattedPrice());
                    }
                });
    }

    /** yarım kalmış (ödenmiş ama tüketilmemiş) satın almaları yeniden bildir */
    @UsedByGodot
    public void restore() {
        if (client == null || !client.isReady()) return;
        client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
                (r, purchases) -> {
                    if (r.getResponseCode() != BillingClient.BillingResponseCode.OK) return;
                    for (Purchase p : purchases) handle(p);
                });
    }

    @UsedByGodot
    public boolean is_ready() {
        return client != null && client.isReady() && !details.isEmpty();
    }

    @UsedByGodot
    public void buy(final String productId) {
        final Activity act = getActivity();
        final ProductDetails pd = details.get(productId);
        if (act == null || client == null || !client.isReady() || pd == null) {
            connect();
            emit("purchase_failed", productId, -1, "not ready");
            return;
        }
        buying = productId;
        act.runOnUiThread(() -> {
            BillingFlowParams.ProductDetailsParams pp = BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(pd).build();
            BillingResult r = client.launchBillingFlow(act,
                    BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(pp)).build());
            if (r.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                emit("purchase_failed", productId, r.getResponseCode(), r.getDebugMessage());
            }
        });
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult r, List<Purchase> purchases) {
        int code = r.getResponseCode();
        if (code == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase p : purchases) handle(p);
        } else if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
            restore();
        } else {
            emit("purchase_failed", buying, code, r.getDebugMessage());
        }
    }

    private void handle(Purchase p) {
        String pid = p.getProducts().isEmpty() ? "" : p.getProducts().get(0);
        if (p.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
            if (notified.add(p.getPurchaseToken())) emit("purchased", pid, p.getPurchaseToken());
        } else if (p.getPurchaseState() == Purchase.PurchaseState.PENDING) {
            emit("pending", pid);
        }
    }

    /** ödül verildikten ve kaydedildikten sonra çağrılır (tüketilmeyen ürün 3 günde iade edilir) */
    @UsedByGodot
    public void consume(final String token) {
        if (client == null || !client.isReady()) {
            notified.remove(token);
            return;
        }
        client.consumeAsync(ConsumeParams.newBuilder().setPurchaseToken(token).build(), (r, t) -> {
            if (r.getResponseCode() == BillingClient.BillingResponseCode.OK) emit("consumed", t);
            else notified.remove(token);
        });
    }
}

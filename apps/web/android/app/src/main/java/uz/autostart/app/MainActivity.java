package uz.autostart.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  /**
   * Ilova o'z o'lchamini O'ZI belgilaydi.
   *
   * NIMA UCHUN: Android WebView matnni telefon sozlamasidagi shrift
   * o'lchamiga ko'paytiradi. Telefonda kattaroq shrift tanlangan bo'lsa,
   * savol variantlari va raqam tugmalari saytdagidan kattaroq chiqadi —
   * ekranga sig'may qoladi. `setTextZoom(100)` shu ko'paytirishni
   * o'chiradi; o'quvchi shriftni ilovaning O'Z sozlamalaridan
   * (Sozlamalar → Shrift) o'zgartiradi.
   */
  @Override
  public void onStart() {
    super.onStart();

    if (getBridge() != null && getBridge().getWebView() != null) {
      getBridge().getWebView().getSettings().setTextZoom(100);
    }
  }
}

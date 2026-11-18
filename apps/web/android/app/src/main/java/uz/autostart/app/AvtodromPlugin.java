package uz.autostart.app;

import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Arrays;

/**
 * Unity'da yozilgan 3D avtodrom simulyatorini ochadi ("Unity as a Library").
 *
 * Simulyator alohida ":Unity" jarayonida ishlaydi: undagi "Orqaga" tugmasi (yoki telefonning
 * orqaga tugmasi) faqat simulyatorni yopadi va foydalanuvchi shu ekranga qaytadi.
 *
 * Simulyator ochilmasa (bu yig'ishda Unity yo'q yoki qurilma 64-bitli emas) — reject qaytadi,
 * JS tomoni esa eski (three.js) simulyatorni ochadi.
 */
@CapacitorPlugin(name = "Avtodrom")
public class AvtodromPlugin extends Plugin {

  static final String UNITY_ACTIVITY = "com.unity3d.player.UnityPlayerActivity";

  /** Unity 6.6 talablari: Android 8.0+ (API 26), arm64, OpenGL ES 3.1+. */
  static final int UNITY_MIN_SDK = 26;
  static final int UNITY_MIN_GLES = 0x30001;

  @PluginMethod
  public void ochish(PluginCall call) {
    if (Build.VERSION.SDK_INT < UNITY_MIN_SDK) {
      call.reject("Simulyator Android 8.0 va undan yangi versiyani talab qiladi");
      return;
    }
    if (!Arrays.asList(Build.SUPPORTED_ABIS).contains("arm64-v8a")) {
      call.reject("Simulyator 64-bitli qurilmani talab qiladi");
      return;
    }
    ActivityManager am = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
    if (am == null || am.getDeviceConfigurationInfo().reqGlEsVersion < UNITY_MIN_GLES) {
      call.reject("Simulyator OpenGL ES 3.1 ni talab qiladi");
      return;
    }
    try {
      Class.forName(UNITY_ACTIVITY);
    } catch (ClassNotFoundException e) {
      call.reject("Simulyator bu yig'ishda yo'q");
      return;
    }
    Intent intent = new Intent();
    intent.setClassName(getContext(), UNITY_ACTIVITY);
    getActivity().startActivity(intent);
    call.resolve();
  }
}

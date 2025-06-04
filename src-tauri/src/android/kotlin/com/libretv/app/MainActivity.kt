package com.libretv.app

import android.os.Build
import android.os.Bundle // 确保导入 Bundle
import android.util.Log // 新增导入
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import androidx.core.view.WindowCompat

private const val TAG = "ImmersiveModeDebug" // 日志 TAG

class MainActivity : TauriActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        Log.d(TAG, "onCreate: Started")
        super.onCreate(savedInstanceState)

        // 1. 启用 Edge-to-Edge 显示，允许内容绘制到系统栏下方
        Log.d(TAG, "onCreate: Setting WindowCompat.setDecorFitsSystemWindows(window, false)")
        WindowCompat.setDecorFitsSystemWindows(window, false)

        // 2. 应用沉浸式全屏模式
        Log.d(TAG, "onCreate: Posting applyImmersiveMode to decorView")
        window.decorView.post {
            Log.d(TAG, "onCreate: decorView.post Runnable executing")
            applyImmersiveMode()
        }
        Log.d(TAG, "onCreate: Finished")
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        Log.d(TAG, "onWindowFocusChanged: Started, hasFocus = $hasFocus")
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            Log.d(TAG, "onWindowFocusChanged: Posting applyImmersiveMode to decorView")
            window.decorView.post {
                Log.d(TAG, "onWindowFocusChanged: decorView.post Runnable executing")
                applyImmersiveMode()
            }
        }
        Log.d(TAG, "onWindowFocusChanged: Finished")
    }

    private fun applyImmersiveMode() {
        Log.d(TAG, "applyImmersiveMode: Started")
        // 确保在 UI 线程执行系统 UI 更改
        runOnUiThread {
            Log.d(TAG, "applyImmersiveMode: Running on UI thread")
            Log.d(TAG, "applyImmersiveMode: Build.VERSION.SDK_INT = ${Build.VERSION.SDK_INT}")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) { // Android 11 (API 30) 及以上
                Log.d(TAG, "applyImmersiveMode: Targeting API 30+")
                val controller = window.insetsController
                if (controller == null) {
                    Log.w(TAG, "applyImmersiveMode: window.insetsController is NULL")
                }
                controller?.let {
                    Log.d(TAG, "applyImmersiveMode: Hiding statusBars and navigationBars")
                    it.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                    Log.d(TAG, "applyImmersiveMode: Setting systemBarsBehavior to BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE")
                    it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    Log.d(TAG, "applyImmersiveMode: API 30+ path finished")
                }
            } else { // Android 10 (API 29) 及以下
                Log.d(TAG, "applyImmersiveMode: Targeting API < 30")
                @Suppress("DEPRECATION")
                val flags = (
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                                or View.SYSTEM_UI_FLAG_FULLSCREEN
                        )
                Log.d(TAG, "applyImmersiveMode: Setting systemUiVisibility to $flags")
                window.decorView.systemUiVisibility = flags
                Log.d(TAG, "applyImmersiveMode: API < 30 path finished")
            }
        }
        Log.d(TAG, "applyImmersiveMode: Finished")
    }

    // 保留现有的 JS 调用方法，现在它们可以复用 applyImmersiveMode
    @com.tauri.plugin.Invoke
    fun enterFullscreenMode(invoke: com.tauri.plugin.Invoke) {
        applyImmersiveMode()
        invoke.resolve()
    }

    @com.tauri.plugin.Invoke
    fun exitFullscreenMode(invoke: com.tauri.plugin.Invoke) {
        runOnUiThread {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.insetsController?.show(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
            } else {
                @Suppress("DEPRECATION")
                window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE // 恢复默认的 UI 可见性
            }
        }
        invoke.resolve()
    }
}

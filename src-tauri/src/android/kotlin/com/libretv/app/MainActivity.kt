package com.libretv.app

import android.os.Build
import android.os.Bundle // 确保导入 Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import androidx.core.view.WindowCompat

class MainActivity : TauriActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. 启用 Edge-to-Edge 显示，允许内容绘制到系统栏下方
        WindowCompat.setDecorFitsSystemWindows(window, false)

        // 2. 应用沉浸式全屏模式
        applyImmersiveMode()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            // 当窗口重新获得焦点时，再次确保沉浸式模式
            applyImmersiveMode()
        }
    }

    private fun applyImmersiveMode() {
        // 确保在 UI 线程执行系统 UI 更改
        runOnUiThread {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) { // Android 11 (API 30) 及以上
                window.insetsController?.let { controller ->
                    controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                    controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                }
            } else { // Android 10 (API 29) 及以下
                @Suppress("DEPRECATION")
                window.decorView.systemUiVisibility = (
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                                or View.SYSTEM_UI_FLAG_FULLSCREEN
                        )
            }
        }
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

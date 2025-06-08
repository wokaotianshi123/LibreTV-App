package com.libretv.app

import android.os.Bundle
import androidx.core.view.WindowCompat

import app.tauri.plugin.WryActivity

class MainActivity : WryActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // This is the crucial part to enable edge-to-edge display.
    // It tells the system that our app will handle drawing behind the system bars.
    WindowCompat.setDecorFitsSystemWindows(window, false)
  }
}

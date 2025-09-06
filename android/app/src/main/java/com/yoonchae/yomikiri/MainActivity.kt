package com.yoonchae.yomikiri

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.lifecycle.lifecycleScope
import com.yoonchae.yomikiri.ui.theme.YomikiriTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    private lateinit var appEnv: AppEnvironment

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        appEnv = AppEnvironment(this)

        enableEdgeToEdge()
        setContent {
            YomikiriTheme {
                AppContent(appEnv = appEnv)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        lifecycleScope.launch(NonCancellable) {
            appEnv.close()
        }
    }
}

@Composable
fun AppContent(
    appEnv: AppEnvironment,
    modifier: Modifier = Modifier,
) {
    var requiresMigration by remember { mutableStateOf<Boolean?>(null) }

    // Check for migration requirements on startup
    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) {
            val migrationRequired = appEnv.db.uniffiRequiresUserMigration()
            requiresMigration = migrationRequired
        }
    }

    // Show migration view if migration is required
    when (requiresMigration) {
        true -> {
            MigrationView(appEnv = appEnv, modifier = modifier)
        }
        false -> {
            MainView(appEnv = appEnv, modifier = modifier)
        }
        null -> {
            // Loading state - could show a loading indicator here if needed
        }
    }
}

@Preview(showBackground = true)
@Composable
fun AppContentPreview() {
    YomikiriTheme {
        AppContent(appEnv = AppEnvironment(context = LocalContext.current))
    }
}

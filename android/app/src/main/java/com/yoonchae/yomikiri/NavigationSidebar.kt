package com.yoonchae.yomikiri

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Help
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.yoonchae.yomikiri.ui.theme.YomikiriTheme

enum class NavigationView {
    INTERNET,
    OPTIONS,
}

data class SidebarItem(
    val icon: ImageVector,
    val title: String,
    val onClick: () -> Unit,
)

@Composable
fun NavigationSidebar(
    onSettingsClick: () -> Unit,
    onHelpClick: () -> Unit,
    onDrawerItemClick: (NavigationView) -> Unit,
    modifier: Modifier = Modifier,
    selectedView: NavigationView? = null,
) {
    val sidebarItems =
        listOf(
            SidebarItem(Icons.Filled.Public, "Internet") { onDrawerItemClick(NavigationView.INTERNET) },
        )

    ModalDrawerSheet(
        modifier = modifier.width(280.dp),
        drawerShape = RectangleShape,
    ) {
        // Header section with settings and help icons
        Row(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp, horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onSettingsClick) {
                Icon(
                    imageVector = Icons.Filled.Settings,
                    contentDescription = "Settings",
                    modifier = Modifier.size(24.dp),
                    tint =
                        if (selectedView ==
                            NavigationView.OPTIONS
                        ) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        },
                )
            }

            Spacer(modifier = Modifier.width(4.dp))

            IconButton(onClick = onHelpClick) {
                Icon(
                    imageVector = Icons.Filled.Help,
                    contentDescription = "Help",
                    modifier = Modifier.size(24.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Spacer(modifier = Modifier.weight(1f))
        }

        // Gray separator
        HorizontalDivider(
            modifier = Modifier.padding(horizontal = 16.dp),
            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Navigation items
        sidebarItems.forEach { item ->
            NavigationDrawerItem(
                icon = {
                    Icon(
                        imageVector = item.icon,
                        contentDescription = null,
                    )
                },
                label = { Text(item.title) },
                selected = selectedView == NavigationView.INTERNET && item.title == "Internet",
                onClick = item.onClick,
                shape = RectangleShape,
            )
        }
    }
}

@Preview
@Composable
fun NavigationDrawerPreview() {
    YomikiriTheme {
        NavigationSidebar(
            onSettingsClick = { },
            onHelpClick = { },
            onDrawerItemClick = { },
            selectedView = NavigationView.INTERNET,
        )
    }
}

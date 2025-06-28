package com.yoonchae.yomikiri

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.tooling.preview.Preview

data class NavigationAction(
    val icon: ImageVector,
    val description: String,
    val onClick: () -> Unit
)


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NavigationHeader(
    title: String,
    actions: Array<NavigationAction>,
    onMenuClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    TopAppBar(
        title = {
            Text(title)
        },
        navigationIcon = {
            IconButton(onClick = onMenuClick) {
                Icon(
                    imageVector = Icons.Filled.Menu,
                    contentDescription = "Menu"
                )
            }
        },
        actions = {
            for (item in actions) {
                IconButton(onClick = item.onClick) {
                    Icon(
                        imageVector = item.icon,
                        contentDescription = item.description
                    )
                }
            }
        },
        modifier = modifier
    )
}

@Preview
@Composable
fun NavigationHeaderPreview() {
    NavigationHeader(
        title = "Title",
        actions = arrayOf(
            NavigationAction(Icons.Outlined.Star, "Bookmark", {}),
            NavigationAction(Icons.Filled.MoreVert, "More", {})
        )
    )
}

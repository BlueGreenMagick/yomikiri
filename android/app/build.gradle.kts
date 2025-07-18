import com.android.build.gradle.internal.tasks.factory.dependsOn

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ktlint.gradle.plugin)
}

android {
    namespace = "com.yoonchae.yomikiri"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.yoonchae.yomikiri"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }

    project.tasks.preBuild.dependsOn("task_build")
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.androidx.webkit)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.anki.android)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.jna) {
        artifact {
            type = "aar"
        }
    }

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)
    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)
}

configure<org.jlleitschuh.gradle.ktlint.KtlintExtension> {
    version.set(libs.versions.ktlint)
    outputToConsole = true
    outputColorName = "RED"
    ignoreFailures = true
}

// Custom tasks for formatting
tasks.register("format") {
    dependsOn("ktlintFormat")
    description = "Format Kotlin code using ktlint"
}

tasks.register("check-format") {
    dependsOn("ktlintCheck")
    description = "Check Kotlin code formatting using ktlint"
}

tasks.register<Exec>("task_build") {
    setWorkingDir("$projectDir/../..")
    // Runs shell command indirectly in /bin/bash because...
    // Android Studio launched from MacOS Dock does not source PATH variable
    // https://issuetracker.google.com/issues/216364005
    commandLine("/bin/bash", "-c", "task prepare:android")
}

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
// Signing key is NOT stored in the repo. CI provides env vars: IHL_KEYSTORE (file path), IHL_STORE_PASS, IHL_KEY_ALIAS, IHL_KEY_PASS.
// If missing, the debug key is used (local testing only).
val stableKs: File? = System.getenv("IHL_KEYSTORE")?.let { File(it) }?.takeIf { it.exists() }

android {
    namespace = "com.ihlauncher.tv"
    compileSdk = 34
    defaultConfig {
        applicationId = "com.ihlauncher.tv"
        minSdk = 24
        targetSdk = 34
        versionCode = 12
        versionName = "1.2.8"
    }
    // Stable signing: so in-app updates (same signature required) work on every build.
    if (stableKs != null) {
        if (System.getenv("IHL_STORE_PASS").isNullOrEmpty() || System.getenv("IHL_KEY_PASS").isNullOrEmpty())
            throw GradleException("IHL_KEYSTORE verildi ama IHL_STORE_PASS / IHL_KEY_PASS eksik")
        signingConfigs {
            create("stable") {
                storeFile = stableKs
                storePassword = System.getenv("IHL_STORE_PASS")
                keyAlias = System.getenv("IHL_KEY_ALIAS") ?: "ihlauncher"
                keyPassword = System.getenv("IHL_KEY_PASS")
            }
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            isDebuggable = false
            signingConfig = if (stableKs != null) signingConfigs.getByName("stable") else signingConfigs.getByName("debug")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    packaging {
        resources.excludes += setOf("META-INF/INDEX.LIST", "META-INF/DEPENDENCIES", "META-INF/LICENSE*", "META-INF/NOTICE*")
    }
}
dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("dev.mobile:dadb:1.2.10")
    implementation("dev.rikka.shizuku:api:13.1.5")
    implementation("dev.rikka.shizuku:provider:13.1.5")
}

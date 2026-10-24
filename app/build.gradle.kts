plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
// İmza anahtarı depoda TUTULMAZ. CI şu ortam değişkenlerini verir: IHL_KEYSTORE (dosya yolu), IHL_STORE_PASS, IHL_KEY_ALIAS, IHL_KEY_PASS.
// Yoksa debug anahtarıyla imzalanır (yalnızca yerel deneme için).
val stableKs: File? = System.getenv("IHL_KEYSTORE")?.let { File(it) }?.takeIf { it.exists() }

android {
    namespace = "com.ihlauncher.tv"
    compileSdk = 34
    defaultConfig {
        applicationId = "com.ihlauncher.tv"
        minSdk = 24
        targetSdk = 34
        versionCode = 3
        versionName = "1.1.0"
    }
    // Sabit imza: uygulama içi güncellemenin (aynı imza şartı) her derlemede çalışması için.
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

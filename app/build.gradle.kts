plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
// Sabit imza anahtarı varsa kullanılır; yoksa derleme normal debug imzasıyla yine de başarıyla biter.
val stableKs = file("ihlauncher.keystore")

android {
    namespace = "com.ihlauncher.tv"
    compileSdk = 34
    defaultConfig {
        applicationId = "com.ihlauncher.tv"
        minSdk = 26
        targetSdk = 34
        versionCode = 15
        versionName = "2.7.1"
    }
    // Sabit imza: uygulama içi güncellemenin (aynı imza şartı) her derlemede çalışması için.
    if (stableKs.exists()) {
        signingConfigs {
            create("stable") {
                storeFile = stableKs
                storePassword = "ihlauncher"
                keyAlias = "ihlauncher"
                keyPassword = "ihlauncher"
            }
        }
    }
    buildTypes {
        debug { if (stableKs.exists()) signingConfig = signingConfigs.getByName("stable") }
        release {
            isMinifyEnabled = false
            if (stableKs.exists()) signingConfig = signingConfigs.getByName("stable")
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

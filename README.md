# Todo Mobile App — React Native CLI

No Expo. Pure React Native CLI — builds a real APK directly.

## Setup

```bash
npm install
```

## Generate debug keystore (one time)

```bash
cd android/app
keytool -genkey -v -keystore debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
cd ../..
```

## Build APK

```bash
cd android
./gradlew assembleRelease
```

APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

## Install on connected Android phone

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

## Or build with GitHub Actions (no local Android SDK needed)

Push to GitHub and use the included workflow — it builds the APK in CI and uploads as artifact.

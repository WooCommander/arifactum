#fair-price


Добавить запись в src/data/changelog.ts для новой версии
Поднять версию в package.json
npm run release — всё остальное автоматически




    "get-android-version": "node scripts/get-android-version.js",
    "sync-android-version": "node scripts/sync-android-version.js",
    "update-android": "npm run build && npm run sync-android-version && npx cap sync android",
    "build-debug-apk": "cd android && gradlew assembleDebug",
    "upload-release": "node scripts/upload-release.js",
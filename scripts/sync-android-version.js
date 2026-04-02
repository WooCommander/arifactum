
import fs from 'fs';
import path from 'path';

const packageJsonPath = path.resolve('package.json');
const buildGradlePath = path.resolve('android', 'app', 'build.gradle');

try {
    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const version = packageJson.version;

    // Read build.gradle
    let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

    // Update versionName
    const versionNameRegex = /versionName\s+"([^"]+)"/;
    const currentVersionNameMatch = buildGradle.match(versionNameRegex);

    if (currentVersionNameMatch) {
        console.log(`Current versionName: ${currentVersionNameMatch[1]}`);
        console.log(`New versionName: ${version}`);
        buildGradle = buildGradle.replace(versionNameRegex, `versionName "${version}"`);
    } else {
        console.error('Could not find versionName in build.gradle');
        process.exit(1);
    }

    // Update versionCode
    const versionCodeRegex = /versionCode\s+(\d+)/;
    const currentVersionCodeMatch = buildGradle.match(versionCodeRegex);

    if (currentVersionCodeMatch) {
        const currentVersionCode = parseInt(currentVersionCodeMatch[1], 10);
        const newVersionCode = currentVersionCode + 1;
        console.log(`Current versionCode: ${currentVersionCode}`);
        console.log(`New versionCode: ${newVersionCode}`);
        buildGradle = buildGradle.replace(versionCodeRegex, `versionCode ${newVersionCode}`);
    } else {
        console.error('Could not find versionCode in build.gradle');
        process.exit(1);
    }

    // Write changes
    fs.writeFileSync(buildGradlePath, buildGradle);
    console.log('Successfully updated android/app/build.gradle');

} catch (error) {
    console.error('Error syncing Android version:', error.message);
    process.exit(1);
}

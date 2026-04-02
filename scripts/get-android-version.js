
import fs from 'fs';
import path from 'path';

const buildGradlePath = path.resolve('android', 'app', 'build.gradle');

try {
    const fileContent = fs.readFileSync(buildGradlePath, 'utf8');

    const versionCodeMatch = fileContent.match(/versionCode\s+(\d+)/);
    const versionNameMatch = fileContent.match(/versionName\s+"([^"]+)"/);

    if (versionCodeMatch && versionNameMatch) {
        const versionCode = versionCodeMatch[1];
        const versionName = versionNameMatch[1];

        console.log(JSON.stringify({
            versionCode: parseInt(versionCode, 10),
            versionName: versionName
        }, null, 2));
    } else {
        console.error('Could not find versionCode or versionName in build.gradle');
        process.exit(1);
    }
} catch (error) {
    console.error('Error reading build.gradle:', error.message);
    process.exit(1);
}

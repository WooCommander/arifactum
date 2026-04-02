const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(filePath));
        } else {
            if (file.endsWith('.vue') || file.endsWith('.scss')) {
                if (filePath.endsWith('tokens.scss') || filePath.endsWith('main.scss')) return;
                results.push(filePath);
            }
        }
    });
    return results;
}

const files = getFiles(srcDir);
let changedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('var(--')) {
        // Replace var(--my-var) with $my-var
        // Note: $ is a special token in replace, we need $$ to represent a literal $
        const newContent = content.replace(/var\(--([^)]+)\)/g, '$$$$$1');
        if (newContent !== content) {
            fs.writeFileSync(file, newContent, 'utf8');
            changedCount++;
        }
    }
});

console.log('Done! Changed files: ' + changedCount);

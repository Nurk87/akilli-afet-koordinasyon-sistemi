const fs = require('fs');
const path = require('path');

function getFiles(dir, files_) {
    files_ = files_ || [];
    const files = fs.readdirSync(dir);
    for (const i in files) {
        const name = path.join(dir, files[i]);
        if (fs.statSync(name).isDirectory()) {
            if (name.includes('node_modules') || name.includes('.git')) continue;
            getFiles(name, files_);
        } else {
            files_.push(name);
        }
    }
    return files_;
}

const strictEmailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const allFiles = getFiles('.');
allFiles.forEach(file => {
    try {
        if (file.includes('node_modules') || file.includes('.git') || file.includes('scratch')) return;
        const content = fs.readFileSync(file, 'utf8');
        const matches = content.match(strictEmailRegex);
        if (matches) {
            matches.forEach(e => {
                if (e.toLowerCase().includes('efesari')) {
                    console.log(`✅ FOUND efesari IN: ${file}`);
                }
            });
        }
    } catch (e) {}
});

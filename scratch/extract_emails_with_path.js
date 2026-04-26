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

const strictEmailRegex = /[a-zA-Z0-9._%+-]+@efesari\.gmail\.com|[a-zA-Z0-9._%+-]+@gmail\.com|efesari@gmail\.com/gi;

const allFiles = getFiles('.');
allFiles.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        if (content.toLowerCase().includes('efesari@gmail.com')) {
            console.log(`✅ FOUND IN FILE: ${file}`);
            // Print surrounding context
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
                if (line.toLowerCase().includes('efesari@gmail.com')) {
                    console.log(`   L${idx + 1}: ${line.trim()}`);
                }
            });
        }
    } catch (e) {}
});

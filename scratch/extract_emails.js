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

const emailRegex = /[a-zA-Z0-9._%+-]+@?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g; // Relaxed @ check for some cases
const strictEmailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const allFiles = getFiles('.');
const emails = new Set();

allFiles.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const matches = content.match(strictEmailRegex);
        if (matches) {
            matches.forEach(e => emails.add(e.toLowerCase()));
        }
    } catch (e) {}
});

console.log('--- ALL EMAILS FOUND IN SOURCE FILES ---');
Array.from(emails).sort().forEach(e => console.log(e));

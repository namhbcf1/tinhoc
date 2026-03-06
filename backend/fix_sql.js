const fs = require('fs');

const sql = fs.readFileSync('vantrangedu_export_full.sql', 'utf8');
const lines = sql.split('\n');

// Find documents table creation
let documentsStart = -1;
let documentsEnd = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('CREATE TABLE documents (')) {
        documentsStart = i;
    }
    if (documentsStart !== -1 && lines[i] === ');') {
        documentsEnd = i;
        break;
    }
}

// Find document_permissions table creation (first table that references documents)
let permissionsStart = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('CREATE TABLE document_permissions (')) {
        permissionsStart = i;
        break;
    }
}

if (documentsStart !== -1 && permissionsStart !== -1 && documentsStart > permissionsStart) {
    const documentsTableLines = lines.splice(documentsStart, documentsEnd - documentsStart + 1);
    lines.splice(permissionsStart, 0, ...documentsTableLines);
    fs.writeFileSync('vantrangedu_export_full_fixed.sql', lines.join('\n'));
    console.log('Fixed SQL output to vantrangedu_export_full_fixed.sql');
} else {
    console.log('Could not find tables or documents is already before permissions.');
}

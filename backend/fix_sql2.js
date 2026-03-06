const fs = require('fs');

const sql = fs.readFileSync('vantrangedu_export_full.sql', 'utf8');
const lines = sql.split(/\r?\n/);

let out = [];

// Push pragma first
out.push('PRAGMA foreign_keys=OFF;');
out.push('BEGIN TRANSACTION;');

// 1. All CREATE TABLE statements (and indices/triggers but mainly tables)
// Since this is a dump from D1, we grab blocks from CREATE to the closing );
for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('CREATE ')) {
        let block = [];
        let j = i;
        while (j < lines.length) {
            block.push(lines[j]);
            if (lines[j].endsWith(';')) {
                out.push(block.join('\n'));
                i = j;
                break;
            }
            j++;
        }
    }
}

// 2. All INSERT and other statements
for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('INSERT ') || lines[i].startsWith('UPDATE ') || lines[i].startsWith('DELETE ')) {
        out.push(lines[i]);
    }
}

out.push('COMMIT;');

fs.writeFileSync('vantrangedu_export_full_fixed2.sql', out.join('\n'));
console.log('Fixed SQL written to vantrangedu_export_full_fixed2.sql');

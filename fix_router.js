const fs = require('fs');
const path = 'E:\\vue\\ERP\\src\\router\\index.js';

let content = fs.readFileSync(path, 'utf8');

// Find the problematic section
const idx = content.indexOf("path: 'stocktake'");
console.log('stocktake found at index:', idx);
if (idx >= 0) {
    console.log('Context:', JSON.stringify(content.substring(idx - 200, idx + 50)));
}

// Fix: remove the extra lines between tape-safety-stock and stocktake
// The pattern is: "      },\n      {\n      }\n      },\n      {"
// Should be: "      },\n      {"
const oldPattern = "      },\r\n      {\r\n      }\r\n      },\r\n      {";
const newPattern = "      },\r\n      {";

if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed with CRLF');
} else {
    const oldPatternLF = "      },\n      {\n      }\n      },\n      {";
    if (content.includes(oldPatternLF)) {
        content = content.replace(oldPatternLF, "      },\n      {");
        fs.writeFileSync(path, content, 'utf8');
        console.log('Fixed with LF');
    } else {
        console.log('Pattern not found');
        // Try more context
        const searchStart = "meta: { title: '胶带安全库存'";
        const si = content.indexOf(searchStart);
        if (si >= 0) {
            console.log('Section from tape-safety-stock:', JSON.stringify(content.substring(si, si + 300)));
        }
    }
}

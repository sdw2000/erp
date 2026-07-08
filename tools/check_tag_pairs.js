const fs = require('fs');
const path = require('path');

function extractTemplate(content) {
  const m = content.match(/<template[\s\S]*?>[\s\S]*?<\/template>/i);
  return m ? m[0] : content;
}

function stripComments(s) {
  return s.replace(/<!--([\s\S]*?)-->/g, '');
}

function stripScriptStyle(s) {
  return s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
}

function getTags(s) {
  const tagRe = /<\/?([a-zA-Z0-9_:\-\.]+)([^>]*)>/g;
  const selfClosingRe = /\/\s*>$/;
  const voids = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
  const tags = [];
  let m;
  while ((m = tagRe.exec(s)) !== null) {
    const raw = m[0];
    const name = m[1];
    const isClose = raw.startsWith('</');
    const isSelf = selfClosingRe.test(raw) || voids.has(name.toLowerCase());
    tags.push({raw, name, isClose, isSelf, index: m.index});
  }
  return tags;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const tpl = extractTemplate(content);
  const cleaned = stripComments(stripScriptStyle(tpl));
  const tags = getTags(cleaned);
  const stack = [];
  const errors = [];
  tags.forEach(t => {
    if (t.isSelf) return;
    if (!t.isClose) {
      stack.push(t.name);
    } else {
      if (stack.length === 0) {
        errors.push({type: 'extra-close', tag: t.name, pos: t.index});
      } else {
        const last = stack[stack.length-1];
        if (last === t.name) {
          stack.pop();
        } else {
          // try to find matching tag down the stack
          const idx = stack.lastIndexOf(t.name);
          if (idx === -1) {
            errors.push({type: 'mismatch', expected: last, found: t.name, pos: t.index});
          } else {
            // unclosed tags in between
            for (let i = stack.length-1; i>idx; i--) {
              errors.push({type: 'unclosed', tag: stack[i]});
            }
            stack.length = idx; // pop to matched
          }
        }
      }
    }
  });
  // remaining unclosed
  while (stack.length) {
    errors.push({type: 'unclosed', tag: stack.pop()});
  }
  return errors;
}

function main() {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('Usage: node check_tag_pairs.js file1.vue [file2.vue]');
    process.exit(2);
  }
  let anyErr = false;
  for (const f of files) {
    const p = path.resolve(f);
    if (!fs.existsSync(p)) {
      console.log(`${f}: NOT FOUND`);
      anyErr = true;
      continue;
    }
    const errs = checkFile(p);
    if (!errs.length) {
      console.log(`${f}: OK`);
    } else {
      anyErr = true;
      console.log(`${f}: ${errs.length} issue(s)`);
      errs.forEach((e, i) => {
        if (e.type === 'unclosed') console.log(`  - Unclosed tag: <${e.tag}>`);
        else if (e.type === 'extra-close') console.log(`  - Extra closing tag: </${e.tag}>`);
        else if (e.type === 'mismatch') console.log(`  - Mismatched closing tag: expected </${e.expected}> but found </${e.found}>`);
        else console.log(`  - ${JSON.stringify(e)}`);
      });
    }
  }
  process.exit(anyErr ? 1 : 0);
}

main();

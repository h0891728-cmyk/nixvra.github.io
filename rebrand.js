const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function (file) {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (content.includes('OmniCore OS')) {
    content = content.replace(/OmniCore OS/g, 'Nixvra');
    changed = true;
  }
  if (content.includes('OmniCore')) {
    content = content.replace(/OmniCore/g, 'Nixvra');
    changed = true;
  }
  if (content.includes('omnicore.app')) {
    content = content.replace(/omnicore\.app/g, 'nixvra.online');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});

import fs from 'fs';
import path from 'path';

const searchRegex1 = /aripan/g;
const replaceWith1 = 'aripan';
const searchRegex2 = /Aripan/g;
const replaceWith2 = 'Aripan';
const searchRegex3 = /ARIPAN/g;
const replaceWith3 = 'ARIPAN';

function replaceInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = content
      .replace(searchRegex1, replaceWith1)
      .replace(searchRegex2, replaceWith2)
      .replace(searchRegex3, replaceWith3);
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  } catch (e) {
    // skip non-text files or directories
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file.includes('lock') || file.includes('.jpg') || file.includes('.png')) continue;
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else {
      replaceInFile(fullPath);
    }
  }
}

walkDir(process.cwd());

import fs from 'fs';
import path from 'path';

export function generateTree(dir: string, depth: number = 0, maxDepth: number = 2, prefix: string = ''): string {
  if (depth > maxDepth) return '';

  let output = '';
  const name = path.basename(dir);
  
  // Ignore git and node_modules
  if (name === '.git' || name === 'node_modules' || name === '.zesbe') return '';

  try {
    const stats = fs.statSync(dir);
    if (!stats.isDirectory()) return '';

    const files = fs.readdirSync(dir);
    
    // Sort directories first, then files
    files.sort((a, b) => {
      const aStat = fs.statSync(path.join(dir, a));
      const bStat = fs.statSync(path.join(dir, b));
      if (aStat.isDirectory() && !bStat.isDirectory()) return -1;
      if (!aStat.isDirectory() && bStat.isDirectory()) return 1;
      return a.localeCompare(b);
    });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isLast = i === files.length - 1;
      const filePath = path.join(dir, file);
      
      // Skip hidden files if not important
      if (file.startsWith('.') && file !== '.env') continue;

      let fileStats;
      try {
        fileStats = fs.statSync(filePath);
      } catch (e) { continue; }

      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';
      
      if (fileStats.isDirectory()) {
        output += `${prefix}${connector}📁 ${file}/\n`;
        output += generateTree(filePath, depth + 1, maxDepth, prefix + childPrefix);
      } else {
        output += `${prefix}${connector}📄 ${file}\n`;
      }
    }
  } catch (e) {
    return '';
  }

  return output;
}

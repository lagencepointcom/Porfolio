import fs from 'fs';
import path from 'path';

const sourceFolders = {
  photos: 'Images/Porfolio photos',
  graphisme: 'Images/Graphisme',
  web: 'Images/Site Web',
};

const publicFolders = {
  photos: 'public/images/portfolio-photos',
  graphisme: 'public/images/graphisme',
  web: 'public/images/site-web',
};

const imagePattern = /\.(png|jpe?g|webp|gif)$/i;

function collectImageFiles(dir, rootDir = dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectImageFiles(fullPath, rootDir, acc);
      continue;
    }
    if (!imagePattern.test(entry.name)) continue;

    const relativeDir = path.relative(rootDir, path.dirname(fullPath));
    acc.push({ fullPath, fileName: entry.name, relativeDir });
  }

  return acc;
}

function resolveDestName({ fileName, relativeDir }, usedNames) {
  if (!relativeDir || relativeDir === '.') {
    usedNames.add(fileName);
    return fileName;
  }

  const folderSlug = relativeDir
    .split(path.sep)
    .filter(Boolean)
    .join('-')
    .replace(/\s+/g, '-');

  let destName = `${folderSlug}-${fileName}`;
  if (!usedNames.has(destName)) {
    usedNames.add(destName);
    return destName;
  }

  let index = 2;
  while (usedNames.has(`${destName}-${index}`)) index += 1;
  destName = `${destName}-${index}`;
  usedNames.add(destName);
  return destName;
}

function syncCategory(src, dest, { recursive = false } = {}) {
  fs.mkdirSync(dest, { recursive: true });

  const sources = recursive
    ? collectImageFiles(src)
    : fs.readdirSync(src, { withFileTypes: true })
      .filter((entry) => entry.isFile() && imagePattern.test(entry.name))
      .map((entry) => ({
        fullPath: path.join(src, entry.name),
        fileName: entry.name,
        relativeDir: '.',
      }));

  const usedNames = new Set();
  const copiedNames = new Set();

  for (const source of sources) {
    const destName = resolveDestName(source, usedNames);
    fs.copyFileSync(source.fullPath, path.join(dest, destName));
    copiedNames.add(destName);
  }

  for (const file of fs.readdirSync(dest)) {
    if (!imagePattern.test(file)) continue;
    if (!copiedNames.has(file)) {
      fs.unlinkSync(path.join(dest, file));
    }
  }

  return [...copiedNames].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

const out = {};

for (const [key, src] of Object.entries(sourceFolders)) {
  const dest = publicFolders[key];
  if (!fs.existsSync(src)) {
    out[key] = [];
    continue;
  }

  const recursive = key === 'graphisme';
  const files = syncCategory(src, dest, { recursive });
  out[key] = files.map((f) => `images/${path.basename(dest)}/${encodeURIComponent(f)}`);
}

fs.writeFileSync(
  'src/portfolio-images.js',
  `export const portfolioImages = ${JSON.stringify(out, null, 2)};\n`,
);

console.log(`Synced: ${out.photos.length} photos, ${out.graphisme.length} graphisme, ${out.web.length} web`);

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

for (const [key, src] of Object.entries(sourceFolders)) {
  const dest = publicFolders[key];
  fs.mkdirSync(dest, { recursive: true });
  if (!fs.existsSync(src)) continue;

  for (const file of fs.readdirSync(src)) {
    if (!/\.(png|jpe?g|webp|gif)$/i.test(file)) continue;
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }
}

const out = {};
for (const [key, folder] of Object.entries(publicFolders)) {
  out[key] = fs.readdirSync(folder)
    .filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => `images/${path.basename(folder)}/${encodeURIComponent(f)}`);
}

fs.writeFileSync(
  'src/portfolio-images.js',
  `export const portfolioImages = ${JSON.stringify(out, null, 2)};\n`,
);

console.log(`Synced: ${out.photos.length} photos, ${out.graphisme.length} graphisme, ${out.web.length} web`);

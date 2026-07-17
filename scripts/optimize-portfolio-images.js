import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const imagePattern = /\.(png|jpe?g|webp|gif)$/i;

const folderRules = {
  'public/images/portfolio-photos': { maxWidth: 1920, quality: 82, format: 'webp' },
  'public/images/graphisme': { maxWidth: 1600, quality: 84, format: 'webp' },
  'public/images/site-web': { maxWidth: 1440, quality: 86, format: 'webp' },
  'public/images/arriere-plan': { maxWidth: 1920, quality: 85, format: 'jpeg' },
};

export async function optimizeFolder(folder, rule) {
  if (!fs.existsSync(folder)) return { count: 0, savedBytes: 0 };

  const entries = fs.readdirSync(folder).filter((file) => imagePattern.test(file));
  let count = 0;
  let savedBytes = 0;

  for (const file of entries) {
    const inputPath = path.join(folder, file);
    const before = fs.statSync(inputPath).size;
    const parsed = path.parse(inputPath);
    const outExt = rule.format === 'jpeg' ? '.jpg' : '.webp';
    const outPath = path.join(folder, `${parsed.name}${outExt}`);
    const tempPath = `${outPath}.tmp`;

    let pipeline = sharp(inputPath, { failOn: 'none' });
    const metadata = await pipeline.metadata();

    if (metadata.width && metadata.width > rule.maxWidth) {
      pipeline = pipeline.resize({ width: rule.maxWidth, withoutEnlargement: true });
    }

    if (rule.format === 'jpeg') {
      await pipeline
        .jpeg({ quality: rule.quality, mozjpeg: true, progressive: true })
        .toFile(tempPath);
    } else {
      await pipeline
        .webp({ quality: rule.quality, effort: 5, smartSubsample: true })
        .toFile(tempPath);
    }

    fs.renameSync(tempPath, outPath);
    if (outPath !== inputPath && fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    const after = fs.statSync(outPath).size;
    savedBytes += Math.max(0, before - after);
    count += 1;
  }

  return { count, savedBytes };
}

export async function optimizeAllPublicImages() {
  let totalCount = 0;
  let totalSaved = 0;

  for (const [folder, rule] of Object.entries(folderRules)) {
    const { count, savedBytes } = await optimizeFolder(folder, rule);
    totalCount += count;
    totalSaved += savedBytes;
    console.log(`Optimized ${count} files in ${folder}`);
  }

  const savedMb = (totalSaved / (1024 * 1024)).toFixed(1);
  console.log(`Total optimized: ${totalCount} files, ~${savedMb} MB saved`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  optimizeAllPublicImages().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

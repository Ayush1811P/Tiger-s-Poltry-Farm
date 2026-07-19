import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const dir = './public';
const files = fs.readdirSync(dir);

for (const file of files) {
  if (file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.png') || file.toLowerCase().endsWith('.jpeg')) {
    const ext = path.extname(file);
    const basename = path.basename(file, ext);
    const outPath = path.join(dir, basename + '.webp');
    const inPath = path.join(dir, file);
    
    console.log(`Processing ${file}...`);
    try {
      await sharp(inPath)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 70, effort: 6 })
        .toFile(outPath);
        
      fs.unlinkSync(inPath);
      console.log(`Converted ${file} to ${basename}.webp and deleted original.`);
    } catch (e) {
      console.error(`Error processing ${file}:`, e);
    }
  }
}

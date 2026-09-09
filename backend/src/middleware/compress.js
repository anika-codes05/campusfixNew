const path = require('path');
const fs = require('fs/promises');
const sharp = require('sharp');

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 80;

module.exports = async function compressPhoto(req, res, next) {
  if (!req.file) return next();
  const input = req.file.path;
  try {
    let image = sharp(input, { animated: false });
    const meta = await image.metadata();
    if (meta.width > MAX_DIMENSION || meta.height > MAX_DIMENSION) {
      image = image.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    image = image.jpeg({ quality: JPEG_QUALITY });

    const outName = req.file.filename.replace(/\.[^.]*$/, '') + '.jpg';
    const outPath = path.join(path.dirname(input), outName);
    await image.toFile(outPath);
    await fs.unlink(input).catch(() => {});

    req.file.path = outPath;
    req.file.filename = outName;
    req.file.mimetype = 'image/jpeg';
    req.file.size = (await fs.stat(outPath)).size;
    next();
  } catch (err) {
    await fs.unlink(input).catch(() => {});
    return res.status(400).json({ message: 'Photo could not be processed.' });
  }
};
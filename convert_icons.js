const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 确保 icons 目录存在
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
}

// 需要生成的图标尺寸
const sizes = [16, 32, 48, 128];

// 读取 SVG 文件
const svgBuffer = fs.readFileSync(path.join(iconsDir, 'icon.svg'));

// 为每个尺寸生成 PNG
async function generateIcons() {
    for (const size of sizes) {
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(path.join(iconsDir, `icon${size}.png`));
        console.log(`Generated ${size}x${size} icon`);
    }
}

generateIcons().catch(console.error); 
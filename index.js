const axios = require('axios');
const pixelmatch = require('pixelmatch');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const { exec } = require('child_process');

// Fetch Figma design data
async function fetchFigmaDesign(figmaFileKey, figmaToken) {
    const url = `https://api.figma.com/v1/files/${figmaFileKey}`;
    const headers = { Authorization: `Bearer ${figmaToken}` };
    const response = await axios.get(url, { headers });
    return response.data;
}

// Configure Android device
async function configureAndroidDevice() {
    return new Promise((resolve, reject) => {
        const command = 'adb devices'; // Example command to check connected devices
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Error configuring Android device: ${stderr}`);
            } else {
                console.log('Connected devices:', stdout);
                resolve(stdout);
            }
        });
    });
}

// Capture screenshot of the app using ADB (Android Debug Bridge)
async function captureAppScreenshot(outputPath) {
    return new Promise((resolve, reject) => {
        const command = `adb exec-out screencap -p > ${outputPath}`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Error capturing screenshot: ${stderr}`);
            } else {
                resolve(`Screenshot saved to ${outputPath}`);
            }
        });
    });
}

// Compare images and highlight differences
function compareImages(image1Path, image2Path, diffPath) {
    return new Promise(async (resolve, reject) => {
        try {
            const img1 = await loadImage(image1Path);
            const img2 = await loadImage(image2Path);

            const canvas = createCanvas(img1.width, img1.height);
            const context = canvas.getContext('2d');

            const diffCanvas = createCanvas(img1.width, img1.height);
            const diffContext = diffCanvas.getContext('2d');

            context.drawImage(img1, 0, 0);
            const img1Data = context.getImageData(0, 0, img1.width, img1.height);

            context.drawImage(img2, 0, 0);
            const img2Data = context.getImageData(0, 0, img2.width, img2.height);

            const diffData = diffContext.createImageData(img1.width, img1.height);
            const mismatchCount = pixelmatch(
                img1Data.data,
                img2Data.data,
                diffData.data,
                img1.width,
                img1.height,
                { threshold: 0.1 }
            );

            diffContext.putImageData(diffData, 0, 0);
            const out = fs.createWriteStream(diffPath);
            const stream = diffCanvas.createPNGStream();
            stream.pipe(out);
            out.on('finish', () => resolve(mismatchCount));
        } catch (error) {
            reject(error);
        }
    });
}

// Example usage
(async () => {
    const figmaFileKey = 'demoFigmaFileKey'; // Replace with your Figma file key
    const figmaToken = 'demoFigmaToken'; // Replace with your Figma API token

    const figmaData = await fetchFigmaDesign(figmaFileKey, figmaToken);
    console.log('Fetched Figma design data:', figmaData);

    const appScreenshotPath = 'app-screenshot.png';
    const figmaScreenshotPath = 'figma-screenshot.png'; // Replace with actual Figma screenshot path
    const diffPath = 'diff.png';

    try {
        await configureAndroidDevice();
        console.log('Android device configured.');

        await captureAppScreenshot(appScreenshotPath);
        console.log('Captured app screenshot.');

        const mismatchCount = await compareImages(figmaScreenshotPath, appScreenshotPath, diffPath);
        console.log(`Mismatch count: ${mismatchCount}`);
        console.log('Diff image saved at:', diffPath);
    } catch (error) {
        console.error(error);
    }
})();
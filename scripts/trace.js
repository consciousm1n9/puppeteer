const puppeteer = require('puppeteer');

(async () => {
    const mobile = puppeteer.devices['iPhone X']

    const browser = await puppeteer.launch({headless: false, defaultViewport: null});
    const page = await browser.newPage();
    await page.emulate(mobile);
    await page.tracing.start({path: 'trace.json', screenshots: true});
    await page.goto('https://www.google.com');
    await page.tracing.stop();
    await browser.close();
})();                   
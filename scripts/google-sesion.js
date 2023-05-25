const email = 'my.email@gmail.com';
const pass = 'secret';

async function execute(browser){
    const page = await browser.newPage();
    const url = 'https://accounts.google.com/ServiceLogin';
    page.setDefaultTimeout(15000);
    try{
        await page.goto(url);
        await page.waitForSelector('input[type=email]');
        await page.type('input[type=email]', email);
        await page.click('div.F9NWFb button');
        await page.waitForTimeout(3000);
        await page.waitForSelector('input[type=password]');
        await page.type('input[type=password]', pass);
        await page.click('div.F9NWFb button');
        await page.waitForTimeout(5000);
    }catch(e){
        await page.screenshot({ path: `error-${new Date().getTime()}.png`, fullPage: true });
        throw "Error LoginGoogle.js:"+e;
    }
}
module.exports = {
    execute
}
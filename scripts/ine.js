const loginGoogle = require('./google.js');
const puppeteer = require('puppeteer-extra');
//Needed for Google login
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/* 
    Tipo EFGH:
        1: 195370336,
        2: 084158010
   
    Tipo C:
        1: CSVLRF91082815H200,
        2: 00,
        3: 4718119523229
 */
const data = [
    {
        "p1": "195370336",
        "p2": "084158018"
    },
    {
        "p1": "CSVLRF91082815H200",
        "p2": "00",
        "p3": "4718119523229"
    }];
const url = 'https://listanominal.ine.mx/scpln/';
let model, p1, p2, p3;
const firstStep = true;

(async () => {
   if(model == undefined){
    model = 1;
    p1 = data[model-1].p1;
    p2 = data[model-1].p2;
    p3 = data[model-1].p3;
   }

    const args =  [
        '--window-size=800,600',
    ];
    const browser = await puppeteer.launch({headless: false, args});
    const page = (await browser.pages())[0];
    await page.setUserAgent('5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');

    page.setDefaultTimeout(10000);
    try{
        //Skip images/styles/fonts loading for improvement performance
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if(req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image'){
                req.abort();
            } else {
                req.continue();
            }
        });

        //Google Login
        await loginGoogle.execute(browser);
        const pc =  (await browser.pages())[1];
        //await pc.close();

        //Model form (EFGH || D || C)
        let form;
        switch (model) {
            case 1:
                form = 'form#formEFGH';
                break;
            case 2:
                form = 'form#formC';
                break;
            default:
                throw `Invalid model option:'${model}'`;
        }

        //Navigation
        await page.goto(url);

        if (firstStep) {
            await page.waitForSelector(`${form}`);

            //Get all inputs by specific form 
            const inputs = await page.$$eval(`${form} input`, el => el.map(x => x.getAttribute("id")));
            await page.type(`${form} input#${inputs[1]}`, p1);
            await page.type(`${form} input#${inputs[2]}`, p2);
            if ( inputs.length == 4 )
                await page.type(`${form} input#${inputs[3]}`, p3);

            const frame = await page.$(`${form} iframe`);
            const rect = await page.evaluate(el => {
                const {x, y} = el.getBoundingClientRect();
                return {x, y};
            }, frame);
            await page.mouse.click((rect.x+30), (rect.y+20));
            await page.waitForTimeout(1000);
            await page.screenshot({ path: `error-${new Date().getTime()}.png`, fullPage: true });
            await page.$eval(`${form}`, form => form.submit());
        }

        try{
            //Status ok
            await page.waitForSelector('table.lead');
            const data = await page.evaluate(() => {
                const tds = Array.from(document.querySelectorAll('table.lead td'));
                return tds.map(td => td.innerText)
            });

            let result = {};
            for (let i = 0; i < data.length; i+=2) {
                result[`'${data[i]}'`] = data[i+1];
            }
            
            //Validity
            const sections = await page.$$(`section`);
            const divs = await sections[3].$$(`div.container > div`);
            const child = await divs[2].$$(`div h4`);
            const text = await (await child[1].getProperty('textContent')).jsonValue();
            result['validity'] = text;

            console.log('result:'+JSON.stringify(result));
            console.log(JSON.stringify({"response": "válida"}));
        }catch(e){
            await page.screenshot({ path: `error-${new Date().getTime()}.png`, fullPage: true });
            let response = "no válida";
            const images = await page.$$('img');
            for(var i=0; i<images.length; i++){
                const img = await(await images[i].getProperty('src')).jsonValue();
                console.log(i+":"+img);
                if(img.includes("datosincorrectos.png")){
                    break;
                }
                if(img.includes("no-vota.jpg")){
                    resonse = "no vigente";
                    break;
                }
            }
            console.log(JSON.stringify({"response": response}));
        }
        await browser.close();
    }catch(e){
        await page.screenshot({ path: `error-${new Date().getTime()}.png`, fullPage: true });
        console.log(JSON.stringify({"response": "error:"+e}));
        await browser.close();
        return '';
    }
})();

/*
*   Excecution by terminal.
*   Receives vars by args separated by space: model_value1_value2_value3
*   1 - Model EFGH
*   2 - Model D
*   3 - Model C
*
*   Example:
*       node ine.js 1 195370336 084158010
*/
process.argv.forEach((value, index) => {
    switch (index) {
        case 2:
            model = value;
        break;
        case 3:
            p1 = value;
        break;
        case 4:
            p2 = value;
        break;
        case 5:
            p3 = value;
        break;
        default:
            break;
    }
});
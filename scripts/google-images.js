const puppeteer = require('puppeteer');
const download = require('image-downloader');
const fs = require("fs");

//constants, init folder
const url = 'https://www.google.com.mx/imghp?hl=en&ogbl';
const busqueda = 'corne keyboard';
const rootDir = `${__dirname}/results/`;

let file = `${rootDir}${new Date().getTime()}#${busqueda}`;
if (!fs.existsSync(rootDir)){
  fs.mkdirSync(rootDir);
}
if (!fs.existsSync(file)){
  fs.mkdirSync(file);
}

(async () => {
//Init browser,tab(page) and navigate to url
  const browser = await puppeteer.launch({headless: false, defaultViewport: null});
  const page = await browser.newPage();
  await page.setDefaultTimeout(5000); 
  await page.goto(url);

//Block image resources to improvement performance
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.resourceType() === 'image')
      request.abort();
    else
      request.continue();
  });

//Search by criteria
  await page.waitForSelector('textarea.gLFyf');
  await page.type('textarea.gLFyf', busqueda);
  await page.keyboard.press('Enter');
  await page.waitForSelector('div.bRMDJf.islir img');

  let flag = true;
  let contador = 0;
//Get all div with image loaded
  let results = await page.$$('div.isv-r.PNCib.MSM1fd.BUooTd');

  while(flag){
    for (let i = contador; i < results.length; i++) {
/**
 * Get img element and src property of each one.
 * Get dom elemnt id and download resource.
 */
      const obj = await results[i].$("img");
      let img = await(await obj.getProperty('src')).jsonValue();
      if(img==''){
        img = await page.evaluate(el => el.getAttribute('data-src'), obj);
      }
      const nameid = await page.evaluate(el => el.getAttribute('data-ri'), results[i]);
      prepareImage(img, nameid);
    }

//scroll to bottom to loading more results
    console.log('scroll to bottom');
    const previousHeight = await page.evaluate('document.body.scrollHeight');
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');

/**
 * Wait for scroll height > previousheight.
 * If trigger timeout try to click on button 'More results',
 * if not exists finish execution.
 */
    try{
      await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
    }catch(err){
      console.log('No more scroll down.');
      try{
        const next = await page.$("input.mye4qd");
        await next.click();
        console.log('Click on "More results" button');
      }catch(e){
        console.log('Final search');
        flag = false;
      }
    }
/**
 * Obtain again all div with images and search for the last item we worked on.
 * Set counter on next.
 */
    let results2 = await page.$$('div.isv-r.PNCib.MSM1fd.BUooTd');
    console.log('New length:'+results2.length);
    let fitem1 = await page.evaluate(el => el.getAttribute('data-ri'),results[results.length-1]);

    for (let index = results2.length-1; index > 0; index--) {
      fitem2 = await page.evaluate(el => el.getAttribute('data-ri'),results2[index]);
      if( fitem1 == fitem2){
        contador = index+1;
        results = results2;
        break;
      }
    }
  }
  await browser.close();
})();
/**
 * Get image. If base64 image or http resource. 
 * @param {string} imgSrc - Source image 
 * @param {string} imgcontador - Counter of dom element
 */
async function prepareImage(imgSrc, imgcontador){
  if (imgSrc.includes("http")){
    console.log("i:"+imgcontador+": "+imgSrc);
    saveImageToDisk(imgSrc, file+"/"+imgcontador+".jpg")
  }else{
    console.log("i:"+imgcontador+": "+imgSrc.substring(0, 30));
    let buf = imgSrc.split(';base64,').pop();
    fs.writeFileSync(file+"/"+imgcontador+".jpg", buf, {encoding: 'base64'}, function(err){
      console.log('err:'+err);
    });
  }
}

function saveImageToDisk(url, localPath) {
    return download.image({
      url,
      dest: localPath 
    }); 
}
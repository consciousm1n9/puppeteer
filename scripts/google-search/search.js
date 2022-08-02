const puppeteer = require('puppeteer');
const download = require('image-downloader');
const fs = require("fs");

//constants
const search = 'corne keyboard';

const url = 'https://www.google.com.mx/imghp?hl=en&ogbl';
const rootPath = `${__dirname}/result`;
let folder = `${rootPath}/${new Date().getTime()}#${search.replace(" ", "-")}`;
if(!fs.existsSync(rootPath))
  fs.mkdirSync(rootPath);
if (!fs.existsSync(folder)){
  fs.mkdirSync(folder);
}

(async () => {
  //init
  const browser = await puppeteer.launch({headless: false, defaultViewport: null});
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(10000);
  await page.setDefaultTimeout(10000);
  await page.goto(url);

  //Ignore charge of images to improvement performance
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.resourceType() === 'image')
        request.abort();
      else
        request.continue();
    });

  //search
  await page.waitForSelector('input.gLFyf.gsfi');
  await page.type('input[name=q]', search);
  await page.keyboard.press('Enter');
  await page.waitForSelector('div.bRMDJf.islir img');
  await delay(3);

  let contador = 0;
  let attempt = 0;
  let cont = true;
  
  while(cont){
    try{
      let elem = await page.$(`[data-ri="${contador}"]`);
      if (elem != undefined){
        attempt = 0;
        const resource = await elem.$("img");
        let img = await(await resource.getProperty('src')).jsonValue();
        if (img == ""){
          img = await page.evaluate(el => el.getAttribute('data-src'), resource);
        }
        prepareImage(img, contador);
        contador++;
      }else{
        console.log('elem undefined -> scroll to bottom');
        attempt++;
        const previousHeight = await page.evaluate('document.body.scrollHeight');
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        try{
          await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
        }catch(err){
          console.log('Error 2:'+err);
          if (attempt == 3){
            console.log('Third attempt. Final search');
            await browser.close();
          }
          let next = await page.$$("input.mye4qd");
          if ( next == undefined ){
            console.log('Final search');
            await browser.close();
          }else{
            console.log('click on bottom button.');
            await page.click('input.mye4qd');
          }
        }
      }
    }catch(e){
      console.log('Error 1:'+e+" Exit");
      cont = false;
    }
  }
  await browser.close();
})();

async function prepareImage(imgSrc, imgcontador){
  if (imgSrc.includes("http")){
    console.log('imgSrc:'+imgSrc+'|cont:'+imgcontador);
    saveImageToDisk(imgSrc, folder+"/"+imgcontador+".jpg");
  }else{
    console.log('base64:...|cont:'+imgcontador);
    let buf = imgSrc.split(';base64,').pop();
    fs.writeFileSync(folder+"/"+imgcontador+".jpg", buf, {encoding: 'base64'}, function(err){
      console.log('err:'+err);
    });
  }
}

function delay(n){
    return new Promise(function(resolve){
        setTimeout(resolve,n*1000);
    });
}
function saveImageToDisk(url, localPath) {
    return download.image({
      url,
      dest: localPath 
    }).then(({filename}) => {
    }).catch((err) => console.log(err));
}
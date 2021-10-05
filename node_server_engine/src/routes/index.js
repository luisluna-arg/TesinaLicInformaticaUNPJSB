const { Router } = require('express');
const router = Router();
const headsetClient = require("../lib");
const assert = require("assert");

// Include file system to write json data
var fs = require('fs')
const logger = fs.createWriteStream('./db/restApiTest.json', {
    flags: 'a' // 'a' means appending (old data will be preserved)
})

const responseSamples = [];
const client = headsetClient.createClient();
client.on("data", (sensedData) => {
    let sample = {
        ts: (new Date).toISOString()
    };
    responseSamples.push({ ...sample, ...sensedData });
});
client.connect();

router.get("/all", (req, res) => {
    var requestSize = !!req.query.size ? parseInt(req.query.size) : 0;
    var sampleCount = responseSamples.length;
    res.json(responseSamples.slice(requestSize > sampleCount ? 0 : sampleCount - requestSize));
});

router.get("/single", (req, res) => {
    res.json(responseSamples[responseSamples.length - 1]);
});

router.get("/", (req, res) => {
    const data = {
        "name": "test",
    }
    res.json(data);
});

module.exports = router;
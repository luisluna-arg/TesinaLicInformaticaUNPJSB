const { Router } = require('express');
const router = Router();
const headsetClient = require("../lib");
const assert = require("assert");

const responseSamples = [];
const client = headsetClient.createClient();
client.on("data", (sensedData) => {
    let sample = {
        data: {
            ts: (new Date).toISOString(),
        }
    };
    responseSamples.push({...sample, ...sensedData });
});
client.connect();

router.get("/test", (req, res) => {
    res.json(responseSamples);
});

router.get("/", (req, res) => {
    const data = {
        "name": "test",
    }
    res.json(data);
});

module.exports = router;
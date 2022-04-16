const { Router } = require('express');
const router = Router();
const headsetClient = require("../lib");
const assert = require("assert");
const { DecisionTreeModel } = require('./src/decisionTree/decision-tree-model');
const MiscUtils = require('./src/decisionTree/misc-utils');

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

router.get("/all", (req, res) => {
    res.json(responseSamples);
});

router.get("/last", (req, res) => {

    res.json(responseSamples[responseSamples - 1]);
});

router.get("/getDirection", (req, res) => {
    let sample = responseSamples[responseSamples - 1],
        eeg = sample.eegPower,
        signals = [eeg.delta, eeg.theta, eeg.lowAlpha, eeg.highAlpha, eeg.lowBeta, eeg.highBeta, eeg.lowGamma, eeg.highGamma],
        model = new DecisionTreeModel('./data');
    result = model.predict(signals);
    res.json(result);
});

router.get("/", (req, res) => {
    const data = {
        "name": "test",
    }
    res.json(data);
});

module.exports = router;
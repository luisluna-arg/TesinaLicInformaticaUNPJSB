const { Router } = require('express');
const router = Router();
const headsetClient = require("../lib");
const { DecisionTreeModel, DecisionTreePaths } = require('../decisionTree/decision-tree-model');
const MiscUtils = require('../decisionTree/misc-utils');
const path = require("path");

// Include file system to write json data
var fs = require('fs');
const { isNull } = require('lodash');


let date = new Date()
let rootDir = './db/';
let dateDir = rootDir + date.getFullYear().toString() + '.' + (date.getMonth() + 1).toString() + '.' + date.getDate().toString() + '/';
let sampletType = 'DERECHA';
// let sampletType = 'IZQUIERDA';
// let sampletType = 'ARRIBA';
// let sampletType = 'ABAJO';

if (!fs.existsSync(rootDir)) { fs.mkdirSync(rootDir); }
if (!fs.existsSync(dateDir)) { fs.mkdirSync(dateDir); }

const logger = fs.createWriteStream(dateDir + sampletType + '.json', {
    flags: 'a' // 'a' means appending (old data will be preserved)
})

let decisionTreeJSON = null;
const filePath = DecisionTreePaths.settingsExport;
const modelSettings = MiscUtils.readJSON(filePath);
decisionTreeJSON = new DecisionTreeModel(modelSettings);

const responseSamples = [];
const client = headsetClient.createClient();

client.on("data", (sensedData) => {
    let sample = {
        ts: (new Date).toISOString()
    };
    let record = { ...sample, ...sensedData };
    responseSamples.push(record);

    if (typeof record.poorSignalLevel != 'undefined' && record.poorSignalLevel == 0) {
        logger.write(JSON.stringify(record) + '\n');
    }
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

function isNullOrUndef(value) {
    return typeof value == 'undefined' || value == null;
}

router.get("/getDirection", (req, res) => {
    let result = 0;
    if (!isNullOrUndef(responseSamples) &&
        responseSamples.length > 0) {
        let sample = responseSamples[responseSamples.length - 1];
        if (!isNullOrUndef(sample) && !isNullOrUndef(sample.eegPower)) {
            let eeg = sample.eegPower;
            let signals = [
                eeg.delta,
                eeg.theta,
                eeg.lowAlpha,
                eeg.highAlpha,
                eeg.lowBeta,
                eeg.highBeta,
                eeg.lowGamma,
                eeg.highGamma
            ];
            result = decisionTreeJSON.predict(signals);
            console.log("result", result);
        }
        else {
            console.log("sample", sample);
        }
    }
    else {
        console.log("responseSamples", responseSamples);
    }

    res.json(result);
});

router.get("/", (req, res) => {
    const data = {
        "name": "test",
    }
    res.json(data);
});

module.exports = router;
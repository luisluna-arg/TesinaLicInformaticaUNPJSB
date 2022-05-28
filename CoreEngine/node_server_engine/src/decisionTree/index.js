const MiscUtils = require('./misc-utils');
const { DecisionTreeModel, confusionMatrix } = require('./decision-tree-model');
const _ = require('lodash');
const { sampleNormalization } = require('./data-preprocessing');

/* ////////////////////////////////////////////////// */
/* ////////////////////////////////////////////////// */
/* ////////////////////////////////////////////////// */

const blankPad = (num, places) => String(num).padStart(places, ' ');

function printConfusionMatrix(predictionLabels, realLabels) {
    let confMat = { matrix: null };
    MiscUtils.printHeader("Matriz de confusión");
    confMat = confusionMatrix(predictionLabels, realLabels);

    let zeroPadCount = _.max(_.flatten(confMat.matrix).filter(o => !isNaN(o))).toString().length;

    for (let i = 0; i < confMat.matrix.length; i++) {
        console.log(confMat.matrix[i].
            map((m, j) => {
                if (m == '|') return m;
                if (i == 0 && j == 0) return new Array(zeroPadCount + 1).join(' ');
                return blankPad(m, zeroPadCount)
            }).join(' '));
    }
    console.log(``);
    console.log(`Listas real/predicción: ${confMat.realLabelCount}/${confMat.predictionCount}`);
    console.log(`Precisión: ${MiscUtils.trunc(confMat.precision * 100, 2)}%`);
    console.log(``);
}

function trainModel() {
    let startTime = new Date();
    MiscUtils.printHeader(`Inicio de entrenamiento: ${startTime.toLocaleString()}`);

    MiscUtils.printHeader("Carga, preprocesamiento de datos y entrenamiento");
    const decisionTree = new DecisionTreeModel('./data');

    /* Test data contiene datos preprocesados */
    const testData = decisionTree.getTestData();

    /* TEST - El modelo se prueba con datos preprocesados */
    /* ////////////////////////////////////////////////// */
    let correct = 0;
    let predictionLabels = [];
    let realLabels = [];
    let testDataCount = testData.samples.length; // 30;

    for (let i = 0; i < testDataCount; i++) {
        const sample = testData.samples[i];
        const prediction = decisionTree.predictPreProcessed(sample);
        const realLabel = testData.labels[i];
        // console.log("prediction", prediction);
        // console.log("realLabel", realLabel);
        predictionLabels.push(prediction);
        realLabels.push(realLabel);
        correct += prediction == realLabel ? 1 : 0;
    }

    MiscUtils.printHeader("Resultados Test");
    console.log(`Correct: ${correct} | Total: ${testData.samples.length}`);
    decisionTree.summary();

    printConfusionMatrix(predictionLabels, realLabels);

    decisionTree.exportDataSet();
    decisionTree.exportPreProcessDataSet();
    decisionTree.exportSettings();

    console.log(`Inicio: ${startTime.toLocaleString()} | Fin: ${new Date().toLocaleString()}`);
}

/* Comentar esta seccion para no entrenar el modelo */
trainModel();




/* TEST JSON - El modelo, reconstruido, se prueba con datos no preprocesados */
/* ///////////////////////////////////////////////////////////////////////// */
MiscUtils.printHeader("Test JSON");

startTime = new Date();

const trainingJSONLoaded = MiscUtils.readJSON('./data/decisiontree-settings.json');
const decisionTreeJSON = new DecisionTreeModel(trainingJSONLoaded);
correct = 0;

let filterStats = trainingJSONLoaded.preProcess.stats.filter;
let normalizationFeat = trainingJSONLoaded.preProcess.stats.normalizationFeat;
let featureNames = [
    'delta',
    'theta',
    'lowAlpha',
    'highAlpha',
    'lowBeta',
    'highBeta',
    'lowGamma',
    'highGamma',
];

function remapLower(sample, featureNames, featureMoments) {
    const featValues = sample.slice(0, featureNames.length);
    const doRemap = featValues.filter((feat, i) => feat > featureMoments[i].q3).length > 0;
    return [...featValues, doRemap ? 0 : sample[featureNames.length]];
}

let fileDataSet = decisionTreeJSON.getDataSet();
testDataSet = _.shuffle(fileDataSet).slice(Math.floor(fileDataSet.length * 0.7))
    .map(s => {
        let norm = sampleNormalization(s, normalizationFeat);
        let remappedNorm = remapLower([...norm, s[s.length - 1]], featureNames, filterStats);
        return [...s.slice(0, s.length), remappedNorm[remappedNorm.length - 1]]
    });


testDataCount = 500;// testDataSet.length;
let pedictionLabelsJSON = [];
let realLabelsJSON = [];

let sampleStartTime;
for (let i = 0; i < testDataCount; i++) {
    sampleStartTime = new Date().getTime()
    const originalSample = testDataSet[i];
    const sample = originalSample.slice(0, originalSample.length - 1);
    const { resample, result } = decisionTreeJSON.predict(sample);
    const prediction = result;
    const realLabel = originalSample[originalSample.length - 1];

    pedictionLabelsJSON.push(parseInt(prediction));
    realLabelsJSON.push(realLabel);

    correct += prediction == realLabel ? 1 : 0;
    // console.log(`Duracion [${i}]: ${new Date(new Date().getTime() - sampleStartTime).getMilliseconds()} ms, 
    //     Label: ${realLabel}, Prediction: ${prediction}`);
}

MiscUtils.printSubHeader("Resultados");
console.log(`Datos entrenamiento | Test: ${MiscUtils.trunc(trainingJSONLoaded.testAccuracy * 100, 2)}% | Precisión: ${MiscUtils.trunc(trainingJSONLoaded.trainAccuracy * 100, 2)}%`);
console.log(`Correctos/Total: ${correct}/${testDataCount} | Precisión test JSON: ${MiscUtils.trunc(correct / testDataCount * 100, 2)}%`);

printConfusionMatrix(pedictionLabelsJSON, realLabelsJSON);

console.log(`Inicio: ${startTime.toLocaleString()} | Fin: ${new Date().toLocaleString()}`);


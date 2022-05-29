const MiscUtils = require('./misc-utils');
const { DecisionTreeModel, confusionMatrix, DecisionTreePaths } = require('./decision-tree-model');
const _ = require('lodash');
const { sampleNormalization } = require('./data-preprocessing');

/* ////////////////////////////////////////////////// */
/* ////////////////////////////////////////////////// */
/* ////////////////////////////////////////////////// */

const tiposRemapeo = {
    mean: "media",
    std: "desvío standard",
    q1: "Q1",
    median: "Mediana",
    q3: "Q3"
};
const comparacionesRemapeo = {
    menor: "menores",
    mayor: "mayores"
};
const tipoRemapeo = tiposRemapeo.q3;
const comparacionRemapeo = comparacionesRemapeo.menor;

let samplesPerLabel = 150000;
const maxPrecision = 1;
let precision = 0;


const logFilePath = `./Logs-${tipoRemapeo}.txt`;


const blankPad = (num, places) => String(num).padStart(places, ' ');

const printLogs = (logLine, logType) => {
    switch (logType) {
        case 1:
            {
                MiscUtils.printHeader(logLine);
                MiscUtils.writeTextFileHeader(logFilePath, logLine);
                break;
            }
        case 2: {
            MiscUtils.printSubHeader(logLine);
            MiscUtils.writeTextFileSubHeader(logFilePath, logLine);
            break;
        }
        default: {
            console.log(logLine);
            MiscUtils.writeTextFile(logFilePath, logLine);
            break;
        }
    }
};

function printConfusionMatrix(predictionLabels, realLabels) {
    let confMat = { matrix: null };
    printLogs("Matriz de confusión", 1);
    confMat = confusionMatrix(predictionLabels, realLabels);

    let zeroPadCount = _.max(_.flatten(confMat.matrix).filter(o => !isNaN(o))).toString().length;

    for (let i = 0; i < confMat.matrix.length; i++) {
        printLogs(confMat.matrix[i].
            map((m, j) => {
                if (m == '|') return m;
                if (i == 0 && j == 0) return new Array(zeroPadCount + 1).join(' ');
                return blankPad(m, zeroPadCount)
            }).join(' '));
    }
    printLogs(``);
    printLogs(`Listas real/predicción: ${confMat.realLabelCount}/${confMat.predictionCount}`);
    printLogs(`Precisión: ${MiscUtils.trunc(confMat.precision * 100, 2)}%`);
    printLogs(``);
}


MiscUtils.mkdir(paths.exportBasePath);

function trainModel(loadingSettings) {
    let startTime = new Date();

    printLogs(``);
    printLogs(``);
    printLogs(`*************************************************`);

    printLogs(`Inicio de entrenamiento: ${startTime.toLocaleString()}`, 1);

    printLogs("Carga, preprocesamiento de datos y entrenamiento", 1);
    const decisionTree = new DecisionTreeModel('./data', loadingSettings);

    let dataSet = decisionTree.getDataSet();
    let dataSetGroup = _.groupBy(dataSet, (sample) => sample[sample.length - 1]);

    /* Test data contiene datos preprocesados */
    const testData = decisionTree.getTestData();
    const trainingData = decisionTree.getTrainingData();
    let totalData =
        testData.samples.map((o, i) => [...o, testData.labels[i]]).
            concat(trainingData.samples.map((o, i) => [...o, trainingData.labels[i]]));
    dataSetGroup = _.groupBy(totalData, (sample) => sample[sample.length - 1]);

    let labelCounts = {};
    let total = 0;
    for (let k in Object.keys(dataSetGroup)) {
        labelCounts[k] = dataSetGroup[k].length;
        total += labelCounts[k];
    }
    labelCounts["total"] = total;

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
        predictionLabels.push(prediction);
        realLabels.push(realLabel);
        correct += prediction == realLabel ? 1 : 0;
    }

    printLogs("Resultados Test", 1);
    printLogs(`Correct: ${correct} | Total: ${testData.samples.length}`, 0);
    printLogs("Conteo por label", 2);
    printLogs(`Remapeo a label 0 con valores de muestra ${comparacionRemapeo} a su ${tipoRemapeo}`, 3);
    for (let k in Object.keys(dataSetGroup)) {
        printLogs(`${k}: ${labelCounts[k]}`, 3);
    }

    decisionTree.summary(printLogs);

    printConfusionMatrix(predictionLabels, realLabels);

    decisionTree.exportDataSet();
    decisionTree.exportPreProcessDataSet();
    decisionTree.exportSettings();

    printLogs(`Inicio: ${startTime.toLocaleString()} | Fin: ${new Date().toLocaleString()}`, 0);

    return correct / testDataCount * 100;
}

function predictWithJson() {
    /* TEST JSON - El modelo, reconstruido, se prueba con datos no preprocesados */
    /* ///////////////////////////////////////////////////////////////////////// */
    MiscUtils.printHeader("Test JSON");

    startTime = new Date();

    const trainingJSONLoaded = MiscUtils.readJSON(DecisionTreePaths.settingsExport);
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

    /* Este remapeo tiene que coincidir con el remapeo de data pre processing */
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
        const prediction = decisionTreeJSON.predict(sample);
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
}






/* Comentar esta seccion para no entrenar el modelo */

while (precision <= maxPrecision) {
    precision = trainModel({
        dataAugmentationTotal: samplesPerLabel,
        dataAugmentation: true,
        dataSetExportPath: paths.dataSetExportPath,
        preProcessedDataSetExportPath: paths.preProcessedDataSetExportPath,
        settingsExportPath: paths.settingsExportPath,
    });
    samplesPerLabel += 5000;
}

// predictWithJson()





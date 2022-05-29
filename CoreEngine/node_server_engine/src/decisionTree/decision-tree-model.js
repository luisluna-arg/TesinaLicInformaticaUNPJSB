const MiscUtils = require('./misc-utils');
const { MOVE_TYPE, loadJSON, splitData, dataPreProcessing } = require('./load-training-json');
const { refactorSample, confusionMatrix } = require('./data-preprocessing');
const DecisionTree = require('decision-tree');

const CLASS_NAME = "moveType";

/* SETTINGS */
/* //////// */
let paths = {};

 paths.decisionTreeData = './src/decisionTree/data/'
 paths.exportBase = paths.decisionTreeData + 'trained-model/';
 paths.dataSetExportPath = paths.exportBase + 'decisiontree-data.csv';
 paths.preProcessedDataSetExport = paths.exportBase + 'decisiontree-preprocessed-data.csv';
 paths.settingsExport = paths.exportBase + 'decisiontree-settings.json';

let DataLoadingSettings = {
    preProcess: false,
    classRemap: true, /* Determina si se remapea una clase segun un criterio de limpieza de ruido */
    shuffle: true,
    split: false,
    truncate: true,
    decimals: 4,
    normalization: true,
    fourier: true,
    deviationMatrix: true,
    dataSetExportPath: paths.dataSetExportPath,
    preProcessedDataSetExportPath: paths.preProcessedDataSetExport,
    settingsExportPath: paths.settingsExport,
    minTolerance: 0.0, /* entre 0 y 1, 0 para que traiga todo */
    dataAugmentationTotal: 150000, /* Muestras totales cada vez que un un archivo o lista de archivos es aumentado */
    dataAugmentation: true
};

const ModelTrainingSettings = {
    MoveTypeEnum: MOVE_TYPE,
    verbose: false
};

function loadData(fileBasePath, loadingSettings) {
    if (loadingSettings != null) {
        DataLoadingSettings = Object.assign({}, DataLoadingSettings, loadingSettings);
    }

    fileBasePath = !MiscUtils.isNullOrUndef(fileBasePath) ? fileBasePath : decisionTreeDataPath;
    let loadedData = null;

    /* CARGA DE ARCHIVOS */
    /* ///////////////// */

    /* Carga de datos sin ningun tipo de procesamiento */
    function loadFiles(moveType) {
        let fileNames = {};
        fileNames[MOVE_TYPE.DOWN] = '/ABAJO.json';
        fileNames[MOVE_TYPE.UP] = '/ARRIBA.json';
        fileNames[MOVE_TYPE.LEFT] = '/IZQUIERDA.json';
        fileNames[MOVE_TYPE.RIGHT] = '/DERECHA.json';

        let filePath = fileBasePath + fileNames[moveType];

        return loadJSON([{ file: filePath, moveType }], DataLoadingSettings);
    }

    loadedData = loadFiles(MOVE_TYPE.DOWN);
    loadedData.concat(loadFiles(MOVE_TYPE.UP));
    loadedData.concat(loadFiles(MOVE_TYPE.LEFT));
    loadedData.concat(loadFiles(MOVE_TYPE.RIGHT));

    const dataSet = loadedData.getSamples();

    /* PREPROCESADO DE DATOS */
    /* ///////////////////// */

    /* Una vez cargados, aplicar preprocesamientos, excepto data augmentation */
    MiscUtils.printSubHeader("Preprocesamiento de datos", true);
    DataLoadingSettings.preProcess = true;
    const preProcessResult = dataPreProcessing(loadedData, DataLoadingSettings);
    loadedData = preProcessResult.data;
    preProcessedDataSet = loadedData.getSamples();

    /* ENTRENAMIENTO */
    /* ///////////// */
    MiscUtils.printSubHeader("Entrenamiento de modelo", true);

    splitData(loadedData);

    const samples = loadedData.getSamples();
    const labels = loadedData.getLabels();

    /* Data de entrenamiento */
    const trainingLength = Math.floor(samples.length * 0.7);
    const trainingData = samples.slice(0, trainingLength);
    const trainingLabels = labels.slice(0, trainingLength);

    /* Data de pruebas */
    const testData = samples.slice(trainingLength);
    const testLabels = labels.slice(trainingLength);

    // loadedData.summary();

    return {
        featureNames: loadedData.getFeatureNames(),
        dataSet: dataSet,
        preProcessedDataSet: preProcessedDataSet,
        training: {
            samples: trainingData,
            labels: trainingLabels
        },
        test: {
            samples: testData,
            labels: testLabels
        },
        preProcess: {
            stats: preProcessResult.stats,
            trainingSettings: preProcessResult.trainingSettings
        }
    };
}

class Sample {
    constructor(sampleValues, featureNames, label) {
        for (let i = 0; i < sampleValues.length; i++) {
            this[featureNames[i]] = sampleValues[i].toString();
        }

        if (label) {
            this[CLASS_NAME] = label;
        }
    }
}

class DecisionTreeModel {

    #JSONTrained = false;
    #trainAccuracy = 0;
    #testAccuracy = 0;
    #decisionTree = null;
    #featureNames = null;
    #preProcess = null;
    #testData = {};
    #dataSet = {};
    #preProcessedDataSet = {};
    #trainingData = {};
    #options = {};

    constructor(...args) {
        if (args.length > 1 && typeof args[0] == 'string') {
            /* Recibe el path de archivos de entrenamiento */
            let filePath = args[0];
            let loadingSettings = args.length == 2 ? args[1] : null;

            let { training, test, featureNames, preProcess, dataSet, preProcessedDataSet } = loadData(filePath, loadingSettings);

            this.#testData = test;
            this.#preProcess = preProcess;
            this.#dataSet = dataSet;
            this.#preProcessedDataSet = preProcessedDataSet;
            this.#createModel(training.samples, training.labels, featureNames, ModelTrainingSettings);
        }
        else if (args.length == 1) {
            /* Recibe el JSON para reconstruir */
            this.#rebuildModel(args[0]);
        }
        else {
            throw 'Error en parametros de constructor de modelo'
        }
    }

    /* Metodos publicos */
    /* **************** */

    predictPreProcessed(predictionSample) {
        let localSample = predictionSample;
        let predicted = this.#decisionTree.predict(new Sample(localSample, this.#featureNames));
        return typeof predicted == 'string' ? parseInt(predicted) : predicted;
    }

    predict(predictionSample) {
        let resample = predictionSample;

        let refactorSettings = Object.assign({}, this.#preProcess);
        refactorSettings.trainingSettings = Object.assign(
            {}, refactorSettings.trainingSettings
            , {
                normalization: true,
                fourier: true,
                dataAugmentation: false,
                shuffle: false
            }
        );

        /* Toda muestra ajena al dataset original debe replantearse */
        resample = refactorSample(resample, refactorSettings);

        let predicted = this.#decisionTree.predict(new Sample(resample, this.#featureNames));
        let result = typeof predicted == 'string' ? parseInt(predicted) : predicted;
        return { resample, result };
    }

    getFeatureNames() {
        return this.#featureNames;
    }

    getDataSet() {
        return this.#dataSet;
    }

    getTrainingData() {
        return this.#trainingData;
    }

    getTestData() {
        return this.#testData;
    }

    toJSON() {
        return {
            modelRebuildSettings: this.#decisionTree.toJSON(),
            trainAccuracy: this.#trainAccuracy,
            testAccuracy: this.#testAccuracy,
            preProcess: this.#preProcess,
            featureNames: this.#featureNames,
            options: this.#options
        };
    }

    summary(logger) {
        let localLogger = MiscUtils.isNullOrUndef(logger) ? console.log : logger;
        MiscUtils.printHeader("Resultados de modelo")
        localLogger(`Muestras de entrenamiento: ${this.#trainingData.samples.length}`);
        localLogger(`Muestras de test: ${this.#testData.samples.length}`);
        localLogger(`Precision de entrenamiento: ${MiscUtils.trunc(this.#trainAccuracy * 100, 2)} % de acierto`);
        localLogger(`Precision de test: ${MiscUtils.trunc(this.#testAccuracy * 100, 2)} % de acierto`);
    }

    /**
     * Exporta el dataset del modelo a un CSV.
     */
    exportDataSet() {
        let localSettings = Object.assign({}, DataLoadingSettings, {
            dataAugmentation: false,
        });

        const path = !MiscUtils.isNullOrUndef(localSettings.dataSetExportPath) ?
            localSettings.dataSetExportPath : paths.dataSetExportPath;

        MiscUtils.writeDataSetCSV(path, this.#dataSet);
    }

    exportPreProcessDataSet() {
        let localSettings = Object.assign({}, DataLoadingSettings, {
            dataAugmentation: false,
        });

        const path = !MiscUtils.isNullOrUndef(localSettings.preProcessedDataSetExportPath) ?
            localSettings.preProcessedDataSetExportPath : paths.preProcessedDataSetExport;

        MiscUtils.writeDataSetCSV(path, this.#preProcessedDataSet);
    }

    exportSettings() {
        let localSettings = Object.assign({}, DataLoadingSettings, {
        });
        const path = !MiscUtils.isNullOrUndef(localSettings.dataSetExportPath) ?
            localSettings.settingsExportPath : paths.settingsExport;
        MiscUtils.writeJSON(path, this.toJSON());
    }

    /* **************************************************************************** */

    /* Metodos privados */
    /* **************** */

    #createModel(...args) {
        let argIndex = 0;
        this.#trainingData.samples = args[argIndex++];
        this.#trainingData.labels = args[argIndex++];
        this.#featureNames = args[argIndex++];

        if (typeof this.#trainingData.samples == 'undefined' || this.#trainingData.samples == null || this.#trainingData.samples.length == 0) {
            throw 'Coleccion features no valida';
        }

        let firstSample = this.#trainingData.samples[0];
        if (!Array.isArray(firstSample) || firstSample.length != this.#featureNames.length) {
            throw 'La forma de las muestras no coincide con la esperada. Muestras: [,' +
            this.#featureNames.length +
            '], Forma recibida: [' +
            this.#trainingData.samples.length +
            ',' +
            firstSample.length +
            ']';
        }

        if (typeof this.#trainingData.labels == 'undefined' || this.#trainingData.labels == null || this.#trainingData.labels.length == 0) {
            throw 'Coleccion labels no valida';
        }

        this.#decisionTree = new DecisionTree(CLASS_NAME, this.#featureNames);
        this.#train();
    }

    #rebuildModel(jsonSettings) {
        this.#JSONTrained = true;

        let modelRebuildJson = jsonSettings.modelRebuildSettings;
        this.#featureNames = jsonSettings.featureNames;
        this.#trainAccuracy = jsonSettings.trainAccuracy;
        this.#preProcess = jsonSettings.preProcess;
        this.#options = jsonSettings.options;

        if (!MiscUtils.isNullOrUndef(DataLoadingSettings.dataSetExportPath)) {
            /* TODO Es necesario? */
            this.#dataSet = MiscUtils.readDataSetCSV(DataLoadingSettings.dataSetExportPath);
        }

        this.#decisionTree = new DecisionTree(CLASS_NAME, this.#featureNames);
        this.#decisionTree.import(modelRebuildJson);
    }

    #train() {
        const trainingLabels = this.#trainingData.labels.map(o => o.toString());
        const trainingSamples = this.#formatSamples(this.#trainingData.samples, trainingLabels);
        this.#decisionTree.train(trainingSamples);
        this.#trainAccuracy = this.#decisionTree.evaluate(trainingSamples);

        const testLabelsForEval = this.#testData.labels.map(o => o.toString());
        const testSamplesForEval = this.#formatSamples(this.#testData.samples, testLabelsForEval);
        this.#testAccuracy = this.#decisionTree.evaluate(testSamplesForEval);
    }

    #formatSamples(samplesToFormat, sampleLabels) {
        return this.#createSamples(samplesToFormat, sampleLabels);
    }

    #createSamples(sampleValues, sampleLabels) {
        let results = [];
        for (let i = 0; i < sampleValues.length; i++) {
            let values = sampleValues[i];
            let label = sampleLabels[i];
            let sampleInstance = new Sample(values, this.#featureNames, label);
            results.push(sampleInstance);
        }
        return results;
    }

}

const DecisionTreePaths = paths;

module.exports = {
    DecisionTreeModel,
    confusionMatrix,
    DecisionTreePaths
}
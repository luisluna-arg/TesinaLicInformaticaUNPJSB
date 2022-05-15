const MiscUtils = require('./misc-utils');
const { MOVE_TYPE, loadJSON, splitData, dataPreProcessing } = require('./load-training-json');
const { refactorSample, confusionMatrix } = require('./data-preprocessing');
const DecisionTree = require('decision-tree');

const CLASS_NAME = "moveType";

/* SETTINGS */
/* //////// */

const ExportBasePath = './src/decisionTree/data/';
const DataSetExportPath = ExportBasePath + 'decisiontree-data.csv';
const PreProcessedDataSetExportPath = ExportBasePath + 'decisiontree-preprocessed-data.csv';
const SettingsExportPath = ExportBasePath + 'decisiontree-settings.json';

const DataLoadingSettings = {
    preProcess: false,
    classRemap: true, /* Determina si se remapea una clase segun un criterio de limpieza de ruido */
    shuffle: true,
    split: false,
    truncate: true,
    decimals: 4,
    normalization: true,
    fourier: true,
    deviationMatrix: true,
    dataSetExportPath: DataSetExportPath,
    preProcessedDataSetExportPath: PreProcessedDataSetExportPath,
    settingsExportPath: SettingsExportPath,
    minTolerance: 0.0, /* entre 0 y 1, 0 para que traiga todo */
    dataAugmentationTotal: 175000, /* Muestras totales cada vez que un un archivo o lista de archivos es aumentado */
    dataAugmentation: true
};

const ModelTrainingSettings = {
    MoveTypeEnum: MOVE_TYPE,
    verbose: false
};

function loadData(fileBasePath) {
    fileBasePath = !MiscUtils.isNullOrUndef(fileBasePath) ? fileBasePath : './data';
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
    MiscUtils.printHeader("Preprocesamiento de datos");
    DataLoadingSettings.preProcess = true;
    const preProcessResult = dataPreProcessing(loadedData, DataLoadingSettings);
    loadedData = preProcessResult.data;
    preProcessedDataSet = loadedData.getSamples();

    /* ENTRENAMIENTO */
    /* ///////////// */
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

    constructor(arg) {
        if (typeof arg == 'string') {
            /* Recibe el path de archivos de entrenamiento */
            let { training, test, featureNames, preProcess, dataSet, preProcessedDataSet } = loadData(arg);

            this.#testData = test;
            this.#preProcess = preProcess;
            this.#dataSet = dataSet;
            this.#preProcessedDataSet = preProcessedDataSet;
            this.#createModel(training.samples, training.labels, featureNames, ModelTrainingSettings);
        }
        else {
            /* Recibe el JSON para reconstruir */
            this.#rebuildModel(arg);
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

    summary() {
        MiscUtils.printHeader("Resultados de modelo")
        console.log(`Muestras de entrenamiento: ${this.#trainingData.samples.length}`);
        console.log(`Muestras de test: ${this.#testData.samples.length}`);
        console.log(`Precision de entrenamiento: ${MiscUtils.trunc(this.#trainAccuracy * 100, 2)} % de acierto`);
        console.log(`Precision de test: ${MiscUtils.trunc(this.#testAccuracy * 100, 2)} % de acierto`);
    }

    /**
     * Exporta el dataset del modelo a un CSV.
     */
    exportDataSet() {
        let localSettings = Object.assign({}, DataLoadingSettings, {
            dataAugmentation: false,
        });

        const path = !MiscUtils.isNullOrUndef(localSettings.dataSetExportPath) ?
            localSettings.dataSetExportPath : DataSetExportPath;

        MiscUtils.writeDataSetCSV(path, this.#dataSet);
    }

    exportPreProcessDataSet() {
        let localSettings = Object.assign({}, DataLoadingSettings, {
            dataAugmentation: false,
        });

        const path = !MiscUtils.isNullOrUndef(localSettings.preProcessedDataSetExportPath) ?
            localSettings.preProcessedDataSetExportPath : PreProcessedDataSetExportPath;

        MiscUtils.writeDataSetCSV(path, this.#preProcessedDataSet);
    }

    exportSettings() {
        let localSettings = Object.assign({}, DataLoadingSettings, {
        });
        const path = !MiscUtils.isNullOrUndef(localSettings.dataSetExportPath) ?
            localSettings.settingsExportPath : SettingsExportPath;
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

module.exports = {
    DecisionTreeModel,
    confusionMatrix
}
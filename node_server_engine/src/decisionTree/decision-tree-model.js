const MiscUtils = require('./misc-utils');
const { MOVE_TYPE, loadJSON, splitData, dataPreProcessing } = require('./load-training-json');
const DecisionTree = require('decision-tree');

const CLASS_NAME = "moveType";

const MoveTypeEnum = {
    NONE: 0,
    DOWN: 1,
    UP: 2,
    LEFT: 3,
    RIGHT: 4
}

const MoveTypeTokens = [
    'NONE',
    'DOWN',
    'UP',
    'LEFT',
    'RIGHT'
];

/* SETTINGS */
/* //////// */

const DataLoadingSettings = {
    preProcess: false,
    filter: false,
    shuffle: true,
    split: false,
    truncate: true,
    decimals: 4,
    normalization: true,
    fourier: true,
    deviationMatrix: true,
    dataAugmentation: false,
    selectFeatures: false,
    dataAugmentationTotal: 1200, /* Muestras totales cada vez que un un archivo o lista de archivos es aumentado */
    minTolerance: 0.0 /* entre 0 y 1, 0 para que traiga todo */
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
    function loadData(moveType) {
        let fileNames = {};
        fileNames[MOVE_TYPE.DOWN] = '/ABAJO.json';
        fileNames[MOVE_TYPE.UP] = '/ARRIBA.json';
        fileNames[MOVE_TYPE.LEFT] = '/IZQUIERDA.json';
        fileNames[MOVE_TYPE.RIGHT] = '/DERECHA.json';

        let filePath = fileBasePath + fileNames[moveType];

        return loadJSON([{ file: filePath, moveType }], DataLoadingSettings);
    }

    loadedData = loadData(MOVE_TYPE.DOWN);
    loadedData.concat(loadData(MOVE_TYPE.UP));
    loadedData.concat(loadData(MOVE_TYPE.LEFT));
    loadedData.concat(loadData(MOVE_TYPE.RIGHT));

    /* PREPROCESADO DE DATOS */
    /* ///////////////////// */

    /* Una vez cargados, aplicar preprocesamientos, excepto data augmentation */
    MiscUtils.printHeader("Preprocesamiento de datos");
    DataLoadingSettings.preProcess = true;
    loadedData = dataPreProcessing(loadedData, DataLoadingSettings);

    /* ENTRENAMIENTO */
    /* ///////////// */
    splitData(loadedData);

    const samples = loadedData.getSamples();
    const labels = loadedData.getLabels();

    // decisionTree: {
    //     MoveTypeEnum: MOVE_TYPE,
    //     verbose: false
    // },

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
        training: {
            samples: trainingData,
            labels: trainingLabels
        },
        test: {
            samples: testData,
            labels: testLabels
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
    #testData = {};
    #trainingData = {};
    #options = null;

    constructor(arg) {
        if (typeof arg == 'string') {
            /* Recibe el path de archivos de entrenamiento de entrenamiento */
            let { training, test, featureNames } = loadData(arg);
            this.#testData = test;
            this.#createModel(training.samples, training.labels, featureNames, ModelTrainingSettings);
        }
        else {
            /* Recibe el JSON para reconstruir */
            this.#rebuildModel(arg);
        }
    }

    constructorOG(...args) {
        let argIndex = 0;
        if (args.length == 2) {
            json = args[argIndex++];
            this.#featureNames = args[argIndex++];

            this.#decisionTree = new DecisionTree(CLASS_NAME, this.#featureNames);
            this.#decisionTree.import(json);
            this.#JSONTrained = true;
        }
        else if (args.length == 4) {

        }

    }

    /* Metodos publicos */
    /* **************** */

    predict(predictionSample) {
        if (this.#JSONTrained) {
        }
        else {
            return this.#decisionTree.predict(new Sample(predictionSample, this.#featureNames));
        }
    }

    getFeatureNames() {
        return this.#featureNames;
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
            trainAccuracy: this.#trainAccuracy
        };
    }

    summary() {
        MiscUtils.printHeader("Resultados de modelo")
        console.log(`Muestras de entrenamiento: ${this.#trainingData.samples.length}`);
        console.log(`Muestras de test: ${this.#testData.samples.length}`);
        console.log(`Precision de entrenamiento: ${MiscUtils.trunc(this.#trainAccuracy * 100, 2)} % de acierto`);
        console.log(`Precision de test: ${MiscUtils.trunc(this.#testAccuracy * 100, 2)} % de acierto`);
    }

    /* Metodos privados */
    /* **************** */
    #createModel(...args) {
        let argIndex = 0;
        this.#trainingData.samples = args[argIndex++];
        this.#trainingData.labels = args[argIndex++];
        this.#featureNames = args[argIndex++];
        this.#options = args[argIndex++];

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
        // this.#trainingData.labels = this.#trainingData.labels.map(o => o.toString());
        // this.#trainingData.samples = this.#formatSamples(this.#trainingData.samples, this.#trainingData.labels);
        this.#train();
    }

    #rebuildModel(...args) {
        let argIndex = 0;
        const json = args[argIndex++];
        
        let modelRebuildJson = json.modelRebuildSettings;
        this.#featureNames = json.featureNames;

        this.#decisionTree = new DecisionTree(CLASS_NAME, this.#featureNames);
        this.#decisionTree.import(modelRebuildJson);
        this.#JSONTrained = true;
    }

    #train() {
        const trainingLabels = this.#trainingData.labels.map(o => o.toString());
        const trainingSamples = this.#formatSamples(this.#trainingData.samples, trainingLabels);
        this.#decisionTree.train(trainingSamples);
        this.#trainAccuracy = this.#decisionTree.evaluate(trainingSamples);

        const testLabelsForEval = this.#testData.labels.map(o => o.toString());
        const testSamplesForEval = this.#formatSamples(this.#testData.samples, testLabelsForEval);
        this.#testAccuracy = this.#decisionTree.evaluate(testSamplesForEval);

        console.log("trainingSamples", trainingSamples[0])
        console.log("testSamplesForEval", testSamplesForEval[0])
    }

    #formatSamples(samplesToFormat, sampleLabels) {
        let localSamples = samplesToFormat;
        if (this.#options.normalize) {
            localSamples = this.#normalizeFeatures(localSamples);
        }
        return this.#createSamples(localSamples, sampleLabels);
    }

    #normalizeFeatures(data) {
        let result;

        tf.tidy(() => {
            let is2dTensor = data.length > 1 && Array.isArray(data[0]);
            result = (is2dTensor ? tf.tensor2d : tf.tensor)(data).transpose().log().transpose().arraySync();
        });

        return result;
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
    DecisionTreeModel
}
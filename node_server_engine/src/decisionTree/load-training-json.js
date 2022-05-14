const fs = require('fs');
const _ = require('lodash');
const { preProcess } = require('./data-preprocessing');
const MiscUtils = require('./misc-utils');

/* ****************************************************** */
/* ****************************************************** */
/* ****************************************************** */

const defaultDecimals = 5;

const MOVE_TYPE = {
  NONE: 0,
  DOWN: 1,
  UP: 2,
  LEFT: 3,
  RIGHT: 4
};

class ReadData {

  #samples = null;
  #labels = null;
  #dataMax = null;
  #featureNames = null;

  /* Features por defecto */
  #DEFAULT_FEATURE_NAMES = [
    "delta",
    "theta",
    "lowAlpha",
    "highAlpha",
    "lowBeta",
    "highBeta",
    "lowGamma",
    "highGamma"
  ];

  constructor(samples, labels = null) {
    this.#samples = samples;
    this.#labels = labels;
    this.#featureNames = this.#DEFAULT_FEATURE_NAMES;
    this.#calculateDataMaxes();
  }

  setSamples(samples, featureNames) {
    this.#samples = samples;
    this.#featureNames = !MiscUtils.isNullOrUndef(featureNames) ? featureNames : this.#DEFAULT_FEATURE_NAMES;
    this.#calculateDataMaxes();
  }

  getSamples() {
    return this.#samples;
  }

  getFeatureNames() {
    return this.#featureNames;
  }

  setLabels(labels) {
    this.#labels = labels;
  }

  getLabels() {
    return this.#labels;
  }

  getDataMaxes() {
    return this.#dataMax;
  }

  concat(data2) {
    if (MiscUtils.isNullOrUndef(data2)) return;

    let data1 = this;
    data1.setSamples(data1.getSamples().concat(data2.getSamples()));

    if (MiscUtils.isNullOrUndef(data1.getSamples()) || data1.getSamples().length == 0) {
      throw 'No hay muestras disponibles para concatenar';
    }

    if (MiscUtils.isNullOrUndef(data1.getLabels()) != MiscUtils.isNullOrUndef(data2.getLabels())) {
      throw 'No se puede concatenar, uno de los dataset esta dividido en muestras y etiquetas'
    }

    if (!MiscUtils.isNullOrUndef(data1.getLabels()) && !MiscUtils.isNullOrUndef(data2.getLabels())) {
      data1.setLabels(data1.getLabels().concat(data2.getLabels()));
    }
  }

  /**
   * Calcula los valores maximos para la coleccion de muestras de la instancia, por columnas
   */
  #calculateDataMaxes(labelColumnCount = null) {

    if (MiscUtils.isNullOrUndef(this.#samples) || this.#samples.length == 0) return;

    const sampleColCount = MiscUtils.getArrayShape(this.#samples)[1];

    if (MiscUtils.isNullOrUndef(labelColumnCount)) {
      labelColumnCount = sampleColCount - this.#featureNames.length;
    }

    const featureColCount = this.#featureNames.length;

    let maxes = new Array(featureColCount).fill(0);

    for (let i = 0; i < this.#samples.length; i++) {
      const currentSample = this.#samples[i];
      for (let j = 0; j < featureColCount; j++) {
        if (maxes[j] < currentSample[j]) maxes[j] = currentSample[j];
      }
    }

    this.#dataMax = maxes;
  }

  getLabelCount = function (data) {
    const labelGetter = (labelContainer) => Array.isArray(labelContainer) ? labelContainer[labelContainer.length - 1] : labelContainer;
    let labelCount = {};
    data.forEach(item => {
      const label = labelGetter(item);
      if (MiscUtils.isNullOrUndef(labelCount[label])) labelCount[label] = 0;
      labelCount[label]++;
    });
    return labelCount;
  };

  summary() {
    console.log("DATA SUMMARY");
    console.log("============");

    const samplesShape = getArrayShape(this.#samples);
    let maxes = {};
    for (let i = 0; i < this.#featureNames.length; i++) {
      maxes[this.#featureNames[i]] = this.#dataMax[i];
    }

    let labelCount;
    if (this.labels != null && Array.isArray(this.#labels)) {
      const labelsShape = getArrayShape(this.#labels);
      labelCount = this.getLabelCount(this.#labels);
      console.log("Shapes Samples|Labels:", samplesShape, labelsShape);
    }
    else {
      labelCount = this.getLabelCount(this.#samples);
      console.log("Shapes Samples:", samplesShape);
    }

    // console.log("Label count:", labelCount);
    console.log("Feature maxes:", maxes);
  }

}

/* ****************************************************** */
/* ****************************************************** */
/* ****************************************************** */



/**
 * Lee archivos pasados por parametro para luego convertirlos en objectos manejables y etiquetados
 * @param fileData Datos leídos de archivos
 * @param settings Settings generales para carga de archivo
 * @returns Datos leídos. Separados en features y labels según settings.
 */
function loadJSON(fileData, settings) {
  const localSettings = Object.assign({
    shuffle: false,
    minTolerance: 0,
    split: false,
    dataAugmentation: false,
    dataAugmentationTotal: 1000,
    normalization: true,
    fourier: true,
    deviationMatrix: false,
    decimals: defaultDecimals
  }, settings);

  let samples = [];
  _.each(fileData, (fileSettings) => {
    /* Read lecture as JSON */
    let data = JSON.parse(
      fs.readFileSync(fileSettings.file, { encoding: 'utf-8' })
    ).filter(o => o.poorSignalLevel === 0);

    let newData = data.
      filter(o => o.poorSignalLevel == 0).
      map((record) => {
        /* Crea el array de la muestra */
        let dataItem = [
          record.eegPower.delta, /* delta */
          record.eegPower.theta, /* theta */
          record.eegPower.lowAlpha, /* lowAlpha */
          record.eegPower.highAlpha, /* highAlpha */
          record.eegPower.lowBeta, /* lowBeta */
          record.eegPower.highBeta, /* highBeta */
          record.eegPower.lowGamma, /* lowGamma */
          record.eegPower.highGamma, /* highGamma */
          /* Tipo movimiento */
          fileSettings.moveType, /* moveType */
        ];

        return dataItem;
      });

    samples = _.concat(samples, newData);
  });

  let readData = new ReadData(samples);
  if (localSettings.preProcess) {
    let preProcessResult = dataPreProcessing(readData, localSettings);
    readData = preProcessResult.data;
  }

  if (localSettings.split) {
    return splitData(readData);
  }

  return readData;
}

function dataPreProcessing(readData, localSettings) {
  let preProcessResult = preProcess(readData.getSamples(), readData.getFeatureNames(), localSettings);
  readData.setSamples(preProcessResult.data, preProcessResult.featureNames);

  return {
    data: readData,
    stats: preProcessResult.stats,
    trainingSettings: preProcessResult.trainingSettings
  };
}

/**
 * Aleatoriza los datos y los separa en arreglos de muestras y etiquetas
 * Tambien ajusta las etiquetas de acuerdo al nivel de tolerancia fijado en options
 * @param data Datos leídos de archivos
 * @param settings Settings generales para carga de archivo
 * @returns Data separada en muestras y etiquetas
 */
function splitData(data) {
  // Split into samples and labels
  let finalSamples = [];
  let finalLabels = [];
  const labelColumnCount = 1;

  _.each(data.getSamples(), (dataArray) => {
    const featureCount = dataArray.length - labelColumnCount;
    let features = dataArray.slice(0, featureCount);
    finalSamples.push(features);
    let labels = dataArray.slice(featureCount);

    if (Array.isArray(labels)) {
      finalLabels.push(labels.length == 1 ? labels[0] : labels);
    }
    else {
      finalLabels.push(labels);
    }
  });

  data.setLabels(finalLabels);
  data.setSamples(finalSamples, data.getFeatureNames());

  return data;
}

/* ****************************************************** */
/* ****************************************************** */
/* ****************************************************** */

module.exports = {
  MOVE_TYPE,
  loadJSON,
  splitData,
  dataPreProcessing
};
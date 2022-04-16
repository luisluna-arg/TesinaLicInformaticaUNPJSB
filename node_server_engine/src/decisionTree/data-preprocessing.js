let tf = require('@tensorflow/tfjs-node');
let dfd = require("danfojs-node");
const _ = require('lodash');
const SMOTE = require('smote');
const correlation = require('./correlation-matrix');
const MiscUtils = require('./misc-utils');

/* ****************************************************** */
/* ****************************************************** */
/* ****************************************************** */
const DefaultDecimals = 5;

/**
 * 
 * @param {Numeric[][]} dataCollection Datos con el formato Coleccion de Coleccion [][]
 * @param {Numeric} decimals Cantidad de decimales a redondeo
 * @returns Coleccion de datos redondeados a N decimales
 */
function truncateNumerics(dataCollection, decimals) {
    return dataCollection.map(itemCollection => itemCollection.map(item => MiscUtils.trunc(item, decimals)));
}


/**
 * Normalización de un arreglo de datos correspondiente a una feature
 * @param {*} data Datos a normalizar
 * @returns Datos normalizados
 */
function normalization(data, settings) {
    let result = [];

    // let scaler = new dfd.MinMaxScaler();
    let scaler = new dfd.StandardScaler()

    const labelColumnIndex = data[0].length - 1;

    tf.tidy(() => {
        let transposed = tf.transpose(tf.tensor2d(data)).arraySync();
        let featureCount = transposed.length;

        let featureIndex = [...Array(featureCount).keys()];

        let tansposedNormalized = [];
        for (let ix in featureIndex) {
            if (ix == labelColumnIndex) {
                tansposedNormalized.push(transposed[ix]);
            }
            else {
                let sf = new dfd.Series(transposed[ix]);
                scaler.fit(sf);
                tansposedNormalized.push(scaler.transform(sf).tensor.abs().arraySync());
            }
        }

        result = tf.transpose(tf.tensor2d(tansposedNormalized)).arraySync();
    })

    return result;
}

/**
 * Genera nuevos datos a partir de una colección de datos originales
 * @param data Datos leídos de archivos
 * @param settings Settings generales para carga de archivo
 * @returns Colecciones de datos y etiquetas expandida
 */
function dataAugmentation(samples, settings) {

    // Here we generate 5 synthetic data points to bolster our training data with an balance an imbalanced data set.
    const byLabel = _.groupBy(samples, (item) => item[item.length - 1]);

    for (const label in byLabel) {
        // console.log("label", label);
        let labelGroup = byLabel[label].map(sample => sample.slice(0, sample.length - 1));
        const countToGenerate = settings.dataAugmentationTotal - labelGroup.length;

        if (countToGenerate <= 0) return labelGroup;

        // Pass in your real data vectors.
        const smote = new SMOTE(labelGroup);

        let newVectors;

        tf.tidy(() => {
            newVectors = smote.generate(countToGenerate).
                map(vector => {
                    // let features = vector.slice(0, maxIx);
                    /* Tipo movimiento */
                    vector.push(parseInt(label));
                    return vector;
                });
        });

        samples = samples.concat(newVectors);
    }
    return samples;
}

/**
 * Aplica Transformada de Fourier Rápida a un arreglo de datos, aplicando una normalizacion sobre el resultado
 * @param {*} dataPoints Arreglo de datos a modificar
 * @returns Arreglo datos modificados por Transformada de Fourier Rápida
 */
function fixFFT(dataPoints, settings) {
    let real = tf.tensor1d(dataPoints);
    let imag = tf.tensor1d(dataPoints);
    let x = tf.complex(real, imag);
    let arrayFFT = tf.real(x.fft()).arraySync();
    let fftMapped = arrayFFT.map(r => (2.0 / arrayFFT.length * Math.abs(r)));
    let result = fftMapped;
    return result;
}

/**
 * Aplica Transformada de Fourier Rápida sobre matriz de datos
 * @param {*} data Matriz de datos sobre los cuales aplicar Transformada de Fourier Rápida
 * @param {*} labelColumnIndex Indice para columna de clase/label
 * @returns Matriz de datos modificados por Transformada de Fourier Rápida
 */
function applyFFT(data, settings) {
    const columnCount = data[0].length;
    const labelColumnIndex = columnCount - 1;
    let result = [];
    tf.tidy(() => {
        let diffLength = data.filter(o => o.length != 9).length;

        // console.log("data[0]", data[0], "data.length", data.length, "diffLength", diffLength);
        let transposed = tf.transpose(tf.tensor2d(data)).arraySync();
        let partialResult = [];
        for (let colIx = 0; colIx < columnCount; colIx++) {
            partialResult[colIx] = labelColumnIndex == colIx ? transposed[colIx] : fixFFT(transposed[colIx], settings);
        }

        result = tf.transpose(tf.tensor2d(partialResult)).arraySync();
    });

    return result;
}

function deviationMatrix(data, featureNames, settings) {
    let devMatrix = [];
    let newFeatureNames = [];

    tf.tidy(() => {
        const correlateAll = true; // Correlacionar todas las columnas
        for (let i = 0; i < data.length; i++) {
            const currentData = data[i];
            const features = currentData.slice(0, currentData.length - 1);
            const label = currentData.slice(currentData.length - 1)[0];

            // CorrelateAll incluye la columna de clase
            const sample = correlateAll ? currentData : features;

            const featureTensor = tf.tensor1d(sample);
            const { mean, variance } = tf.moments(featureTensor);
            const stdDeviation = tf.sqrt(variance);
            const meanValue = mean.dataSync()[0];
            const stdDevValue = stdDeviation.dataSync()[0];

            // // console.log("data[i]", data[i].length);
            // // console.log("features.length", features.length);

            let resampled = [];
            for (let j = 0; j < features.length; j++) {
                resampled.push(Math.abs(features[j] - meanValue));
                resampled.push(Math.abs(features[j] - stdDevValue));
            }
            resampled.push(label);

            devMatrix.push(resampled);
        }

        const featureCount = data[0].length - 1;
        for (let i = 0; i < featureCount; i++) {
            const featureName = featureNames[i];
            newFeatureNames.push(`${featureName}_m`);
            newFeatureNames.push(`${featureName}_std`);
        }
    });

    return { devMatrix, newFeatureNames };
}

function filterDeviation(data) {
    let result = data;
    tf.tidy(() => {
        let transposed = tf.transpose(tf.tensor(data)).arraySync();
        let indexesToRemove = [];
        for (let i = 0; i < transposed.length - 1; i++) {
            const featureArray = transposed[i];
            let oneFeature = tf.tensor1d(featureArray);
            oneFeature = oneFeature.add(1);
            const { mean, variance } = tf.moments(oneFeature);
            const stdDeviation = tf.sqrt(variance);
            const stdDeviationVal = stdDeviation.arraySync();
            const devCoef = stdDeviation.div(mean);
            const devCoefVal = devCoef.arraySync();

            // console.log("[" + i + "] devCoef (%)", (devCoefVal * 100).toFixed(2), "stdDeviation", stdDeviationVal);

            featureArray.forEach((o, index) => {
                let devDiff = Math.abs(o - stdDeviationVal);
                let deviations = MiscUtils.trunc(devDiff / stdDeviationVal, 2);
                result.push([deviations, devDiff, index]);
                if (deviations > 2) indexesToRemove.push(index);
            });
        }

        indexesToRemove = [...new Set(indexesToRemove)];

        result = indexesToRemove.map(i => data[i]);
    });

    return result;
}

function remapClass(data) {
    let result = data;
    tf.tidy(() => {
        let transposed = tf.transpose(tf.tensor(data)).arraySync();
        let stdDeviations = transposed.map(featureArray => {
            let oneFeature = tf.tensor1d(featureArray);
            oneFeature = oneFeature.add(1);
            const { mean, variance } = tf.moments(oneFeature);
            const stdDeviation = tf.sqrt(variance);
            const stdDeviationVal = stdDeviation.arraySync();
            return stdDeviationVal;
        });

        result = data.map(sample => {
            const zeroClass = stdDeviations.filter((o, i) => sample[i] < o).length == sample.length - 1;
            if (zeroClass) sample[sample.length - 1] = 0;
            return sample;
        });
    });

    return result;
}

function filterNone(result) {
    return result.filter(o => o[o.length - 1] > 0);
}

function filterCorrelationMatrix(data, featureNames) {
    const features = data.map(o => o.slice(0, o.length - 1));
    const correlationResult = correlation.calculateCorrelation(features);

    let newResult = [];
    let newFeatureNames = [];
    tf.tidy(() => {
        const avgMap = correlationResult.map(item => {
            return (_.sum(item) - 1) / (item.length - 1);
        });

        const { mean } = tf.moments(avgMap);
        let indexToKeep = [];
        avgMap.forEach((currentValue, featureIndex) => {
            if (currentValue >= mean.arraySync()) indexToKeep.push(featureIndex);
        });

        newResult = data.map(sample => {
            let resampled = indexToKeep.map(index => sample[index]);
            resampled.push(sample[sample.length - 1]);
            return resampled;
        });

        newFeatureNames = indexToKeep.map(index => featureNames[index]);
    });

    return { updatedSamples: newResult, updatedFeatureNames: newFeatureNames };
}


function shuffle(samples) {
    return _.shuffle(samples);
}

/**
 * Normaliza datos y aplica Transformada de Fourier Rápida
 * @param {*} data Matriz de datos a pre procesar para aplicar a modelos
 * @param {*} labelColumnIndex Indice para columna de clase/label
 * @returns Matriz de datos Pre Procesados
 */
function preProcess(data, dataFeatureNames, settings) {

    // console.log("preProcess");

    let localSettings = Object.assign({
        filter: false,
        normalization: true,
        fourier: true,
        deviationMatrix: true,
        truncate: true,
        decimals: DefaultDecimals
    }, settings);

    // console.log("localSettings", localSettings);

    let result = data;
    
    if (localSettings.selectFeatures) {
        let { updatedSamples, updatedFeatureNames } = filterCorrelationMatrix(result, dataFeatureNames);
        result = updatedSamples;
        dataFeatureNames = updatedFeatureNames;
    }

    if (localSettings.filter) {
        // result = filterDeviation(result);
        result = remapClass(result);
        // result = filterNone(result);
    }

    if (localSettings.fourier || localSettings.normalization) {
        result = normalization(result, localSettings);
    }

    if (localSettings.fourier) {
        result = applyFFT(result, localSettings);
    }

    if (localSettings.dataAugmentation) {
        // console.log("dataAugmentation.result", result[0]);
        result = dataAugmentation(result, localSettings);
    }

    if (localSettings.deviationMatrix) {
        let { devMatrix, newFeatureNames } = deviationMatrix(result, dataFeatureNames, localSettings);
        result = devMatrix;
        dataFeatureNames = newFeatureNames;
    }

    if (localSettings.truncate) {
        result = truncateNumerics(result, localSettings.decimals);
    }

    if (localSettings.shuffle) {
        result = shuffle(result);
    }

    return { result, featureNames: dataFeatureNames };
}

/* ****************************************************** */
/* ****************************************************** */
/* ****************************************************** */

/* ****************************************************** */
/* ****************************************************** */
/* ****************************************************** */

module.exports = {
    preProcess
};
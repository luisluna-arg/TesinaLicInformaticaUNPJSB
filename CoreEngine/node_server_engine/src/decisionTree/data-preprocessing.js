let tf = require('@tensorflow/tfjs-node');
let dfd = require("danfojs-node");
const _ = require('lodash');
const SMOTE = require('smote');
const MiscUtils = require('./misc-utils');

/* ****************************************************** */
/* ****************************************************** */
/* ****************************************************** */
const DefaultDecimals = 5;

/**
 * 
 * @param {Numeric[]} sample Muestra a truncar
 * @param {Numeric} decimals Cantidad de decimales a redondeo
 * @returns Coleccion de datos redondeados a N decimales
 */
function truncateSampleNumerics(sample, decimals) {
    return sample.map(item => MiscUtils.trunc(item, decimals));
}

/**
 * 
 * @param {Numeric[][]} dataCollection Datos con el formato Coleccion de Coleccion [][]
 * @param {Numeric} decimals Cantidad de decimales a redondeo
 * @returns Coleccion de datos redondeados a N decimales
 */
function truncateNumerics(dataCollection, decimals) {
    return dataCollection.map(sample => truncateSampleNumerics(sample, decimals));
}

/**
 * Normalización de un arreglo de datos correspondiente a una feature
 * @param {*} data DatoSet a normalizar
 * @returns DatoSet normalizado
 */
function dataSetNormalization(data) {
    let normalizedData = [];

    let scaler = new dfd.MinMaxScaler()

    const labelColumnIndex = data[0].length - 1;
    const featureStatistics = []

    tf.tidy(() => {
        let transposed = tf.transpose(tf.tensor(data)).arraySync();
        let featureCount = transposed.length;

        let featureIndex = [...Array(featureCount).keys()];

        let transposedNormalized = [];
        for (let ix in featureIndex) {
            if (ix == labelColumnIndex) {
                transposedNormalized.push(transposed[ix]);
            }
            else {
                let sf = new dfd.DataFrame(transposed[ix].map(o => [o]));
                scaler.fit(sf);

                /* Transformacion [z = (x - u) / s ] | x: valor original, u: media, s: desvio estandard */
                transposedNormalized.push(scaler.transform(sf).tensor.abs().arraySync());
                featureStatistics[ix] = {
                    min: scaler.$min.arraySync()[0],
                    max: scaler.$max.arraySync()[0]
                }
            }
        }

        normalizedData = tf.transpose(tf.tensor(transposedNormalized)).arraySync()[0];
    });

    return { normalizedData, featureStatistics };
}

/**
 * Normaliza una muestra, aplicando el mismo proceso aplicado en dataSetNormalization
 * @param {*} sample 
 * @param {*} featureStatistics 
 * @returns Muestra normalizada
 */
function sampleNormalization(sample, featureStatistics) {
    const features = sample.slice(0, sample.length);
    return featureStatistics.map((featStats, index) => {
        const feature = features[index];

        /* 
        X_std = (X - X.min(axis=0)) / (X.max(axis=0) - X.min(axis=0))
        X_scaled = X_std * (max - min) + min 
        */
        /* Valor normalizado */
        let X_std = (feature - featStats.min) / (featStats.max - featStats.min)
        /* Valor restaurado */
        // let X_restores = X_std * (featStats.max - featStats.min) + featStats.min

        result = X_std;
        return result;
    });
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

    let maxSamplesCount = Object.keys(byLabel).map(k => byLabel[k].length).reduce((a, b) => Math.max(a, b));
    maxSamplesCount = Math.max(settings.dataAugmentationTotal, maxSamplesCount);
    let counter = 0;
    while (counter < maxSamplesCount) {
        counter += 500;
    }
    maxSamplesCount = counter;

    for (const label in byLabel) {
        let labelGroup = byLabel[label].map(sample => sample.slice(0, sample.length - 1));
        const countToGenerate = maxSamplesCount - labelGroup.length;

        if (countToGenerate > 0) {
            // Pass in your real data vectors.
            const smote = new SMOTE(labelGroup);

            let newVectors;

            tf.tidy(() => {
                newVectors = smote.generate(countToGenerate).
                    map(vector => [...vector, parseInt(label)]
                    );
            });

            samples = samples.concat(newVectors);
        }
    }
    return samples;
}

/**
 * Aplica Transformada de Fourier Rápida a un arreglo de datos, aplicando una normalizacion sobre el resultado
 * @param {*} dataPoints Arreglo de datos a modificar
 * @returns Arreglo datos modificados por Transformada de Fourier Rápida
 */
function fixFFT(dataPoints) {
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
function applyFFT(data) {
    let result = [];
    tf.tidy(() => {
        for (let i = 0; i < data.length; i++) {
            let originalSample = data[i];
            let featureValues = originalSample.slice(0, originalSample.length - 1);
            let resampled = [...fixFFT(featureValues), originalSample[originalSample.length - 1]];
            result.push(resampled);
        }
    });
    return result;
}

function correlateSample(currentData, includesClass, featureStats) {
    let resampled = [];
    let meanValue = null, varianceValue = null, stdDevValue = null;
    tf.tidy(() => {
        const featureLength = currentData.length - (includesClass ? 1 : 0);
        const label = currentData.slice(featureLength)[0];
        const sample = currentData.slice(0, featureLength);

        const { mean, variance } = tf.moments(tf.tensor1d(sample));
        meanValue = mean.arraySync();
        varianceValue = variance.arraySync();
        stdDevValue = tf.sqrt(variance).arraySync();

        for (let i = 0; i < sample.length; i++) {
            let currFeature = sample[i];
            let currMoments = featureStats[i];

            /* Respecto de todo el dataset */
            resampled.push(currFeature - currMoments.mean);
            resampled.push(currFeature - currMoments.std);
        }

        resampled.push(meanValue);
        resampled.push(stdDevValue);

        if (!MiscUtils.isNullOrUndef(label))
            resampled.push(label);
    });

    return { sample: resampled, meanValue, varianceValue, stdDevValue };
}

function deviationMatrix(data, featureNames, settings) {
    let samples = data.map(o => o.slice(0, featureNames.length));

    /* Media, Varianza y Desvio Estandar de cada colecion completa de features */
    let featureStats = null;
    tf.tidy(() => {
        featureStats = tf.transpose(samples).arraySync().
            map((sample, i) => {
                let moments = tf.moments(tf.tensor1d(sample));
                return {
                    feature: featureNames[i],
                    mean: moments.mean.arraySync(),
                    variance: moments.variance.arraySync(),
                    std: tf.sqrt(moments.variance).arraySync()
                };
            });
    });

    /* Media, Varianza y Desvio Estandar de cada muestra y su remuestreo */
    let sampleStats = [];
    let devMatrix = data.map(row => {
        let correlationResult = correlateSample(row, true, featureStats);
        sampleStats.push({
            mean: correlationResult.meanValue,
            variance: correlationResult.meanValue,
            std: correlationResult.stdDevValue
        });
        return correlationResult.sample;
    })

    let newFeatureNames = [];
    const featureCount = data[0].length - 1;
    for (let i = 0; i < featureCount; i++) {
        const featureName = featureNames[i];
        newFeatureNames.push(`${featureName}_m`);
        newFeatureNames.push(`${featureName}_std`);
    }
    newFeatureNames.push(`mean`);
    newFeatureNames.push(`std`);

    let gralMean = _.sum(sampleStats.map(o => o.meanValue)) / sampleStats.length;
    let gralStd = Math.sqrt(_.sum(sampleStats.map(o => Math.pow(o.stdDevValue, 2))) / sampleStats.length);

    return { devMatrix, newFeatureNames, gralMean, gralStd, featureStats };
}

function shuffle(samples) {
    return _.shuffle(samples);
}

function remapLower(samples, featureNames) {
    let result = [];
    let featureMoments;
    tf.tidy(() => {
        featureMoments = featureNames.map((f, colIndex) => {
            let featureSamples = samples.map(s => s[colIndex]);
            let orderedValues = _.orderBy(featureSamples);

            const { mean, variance } = tf.moments(tf.tensor(featureSamples));
            return {
                min: _.min(featureSamples),
                max: _.max(featureSamples),
                mean: mean.arraySync(),
                std: tf.sqrt(variance).arraySync(),
                q1: orderedValues[Math.floor(orderedValues.length / 4)],
                median: orderedValues[Math.floor(orderedValues.length / 2)],
                q3: orderedValues[Math.floor(orderedValues.length / 4 * 3)],
            }
        });

        result = samples.map((sample, i) => {
            const featValues = sample.slice(0, featureNames.length);
            const doRemap = featValues.filter((feat, i) => feat < featureMoments[i].std).length == featValues.length;
            let result = [...featValues, doRemap ? 0 : sample[sample.length - 1]];
            return result;
        });
    });

    return {
        data: result,
        featureStats: featureMoments
    };
}

/**
 * Normaliza datos y aplica Transformada de Fourier Rápida
 * @param {*} data Matriz de datos a pre procesar para aplicar a modelos
 * @param {*} labelColumnIndex Indice para columna de clase/label
 * @returns Matriz de datos Pre Procesados
 */
function preProcess(data, dataFeatureNames, settings) {
    let localSettings = Object.assign({}, {
        filter: false,
        normalization: true,
        fourier: true,
        deviationMatrix: true,
        truncate: true,
        decimals: DefaultDecimals
    }, settings);

    let result = data;
    let normalizationFeatStats = null;
    let devMatrixStats = null;
    let filterStats = null;

    if (localSettings.fourier || localSettings.normalization) {
        const normalizationResult = dataSetNormalization(result);
        result = normalizationResult.normalizedData;
        normalizationFeatStats = normalizationResult.featureStatistics;
    }

    if (localSettings.classRemap) {
        let filterResult = remapLower(result, dataFeatureNames);
        result = filterResult.data;
        filterStats = filterResult.featureStats;
    }

    if (localSettings.fourier) {
        result = applyFFT(result, localSettings);
    }

    if (localSettings.dataAugmentation) {
        result = dataAugmentation(result, localSettings);
    }

    if (localSettings.deviationMatrix) {
        let { devMatrix, newFeatureNames, gralMean, gralStd, featureStats } = deviationMatrix(result, dataFeatureNames, localSettings);
        result = devMatrix;
        dataFeatureNames = newFeatureNames;
        devMatrixStats = { gralMean, gralStd, featureStats };
    }

    if (localSettings.truncate) {
        result = truncateNumerics(result, localSettings.decimals);
    }

    if (localSettings.shuffle) {
        result = shuffle(result);
    }

    return {
        data: result,
        featureNames: dataFeatureNames,
        stats: {
            normalizationFeat: normalizationFeatStats,
            devMatrix: devMatrixStats,
            filter: filterStats
        },
        trainingSettings: {
            selectedFeatures: dataFeatureNames,
            truncateDecimals: localSettings.decimals,
            classRemap: localSettings.classRemap,
            fourier: localSettings.fourier,
            normalization: localSettings.normalization,
            dataAugmentation: localSettings.dataAugmentation,
            deviationMatrix: localSettings.deviationMatrix,
            truncate: localSettings.truncate,
        }
    };
}

function refactorSample(sample, preProcessData) {
    let result = sample;

    const normalizationFeatStats = preProcessData.stats.normalizationFeat;
    const devMatrixStats = preProcessData.stats.devMatrix;
    const trainingSettings = preProcessData.trainingSettings;

    if (trainingSettings.normalization) {
        result = sampleNormalization(result, normalizationFeatStats);
    }

    if (trainingSettings.fourier) {
        result = fixFFT(result);
    }

    if (trainingSettings.deviationMatrix) {
        let correlationResult = correlateSample(result, false, devMatrixStats.featureStats);
        result = correlationResult.sample;
    }

    if (trainingSettings.truncate) {
        result = truncateSampleNumerics(result, trainingSettings.truncateDecimals);
    }

    return result;
}

function confusionMatrix(predictionLabels, realLabels) {
    let result = null;

    let out;
    let distinctValues = [...new Set([...predictionLabels, ...realLabels])];
    if (distinctValues.length === 1) {
        let mayorLabel = distinctValues[0];
        out = new Array(mayorLabel + 1).fill((() => {
            let newArray = new Array(mayorLabel + 1);
            newArray.fill(0);
            return newArray;
        })());

        for (let i = 0; i < predictionLabels.length; i++) {
            const prediction = predictionLabels[i];
            const real = realLabels[i];
            const equals = prediction == real;
            out[prediction][prediction] += equals ? 1 : 0;
        }
    }
    else {
        tf.tidy(() => {
            /* Las label son 0-based */
            const labels = tf.tensor1d(realLabels.map(o => o), 'int32');
            const predictions = tf.tensor1d(predictionLabels.map(o => o), 'int32');
            const numClasses = _.max([...new Set([...predictionLabels, ...realLabels])]) + 1;
            out = tf.math.confusionMatrix(labels, predictions, numClasses).arraySync();
        });
    }

    let matrix = [[' ', '|', ...out[0].map((v, i) => i)]];
    for (let i = 0; i < out.length; i++) {
        matrix.push([i, '|', ...out[i]]);
    }

    result = {
        matrix: matrix,
        predictionCount: predictionLabels.length,
        realLabelCount: realLabels.length,
        precision: _.sum(out.map((row, i) => row[i])) / predictionLabels.length,
    }

    return result;
}

/* ****************************************************** */
/* ****************************************************** */
/* ****************************************************** */

module.exports = {
    preProcess,
    refactorSample,
    confusionMatrix,
    sampleNormalization
};
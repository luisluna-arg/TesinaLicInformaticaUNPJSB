const MiscUtils = require('./misc-utils');
const { DecisionTreeModel } = require('./decision-tree-model');

MiscUtils.printHeader("Carga, preprocesamiento de datos y entrenamiento");
const decisionTree = new DecisionTreeModel('./data');
const testData = decisionTree.getTestData();

/* TEST */
/* //// */
let correct = 0;
for (let i = 0; i < testData.samples.length; i++) {
    const sample = testData.samples[i];
    const prediction = decisionTree.predict(sample);
    const equals = prediction == testData.labels[i];
    correct += equals ? 1 : 0;
    // console.log(`Prediction: ${prediction}`, `Expected: ${testLabels[i]}`, equals);
}

MiscUtils.printHeader("Resultados Test");
console.log(`Correct: ${correct} | Total: ${testData.samples.length}`);
decisionTree.summary();

console.log(decisionTree.getFeatureNames());
console.log(decisionTree.getTrainingData().samples[0]);
console.log(decisionTree.getTestData().samples[0]);
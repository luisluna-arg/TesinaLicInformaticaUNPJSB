<template>
  <div>
    <div id="input-bar" class="input-bar">
      <label>Lectura vivo: </label>
      <input type="checkbox" id="liveChart" v-model="liveChart" @change="onChange_FromDisk" >
      <label>Interv. actualiz. (ms): </label>
      <input v-model.number="updateInterval" readonly type="number" />
      <label>Muestras: </label>
      <input v-model.number="sampleCount" @change="onChange_SampleCout" type="number" />
      <label for="jsonFile">JSON: </label>
      <input type="file" id="jsonFile" name="jsonFile" accept=".json" @change="onChange_JsonFile">
    </div>
    <div id="stats-bar">
      <label>Atención: </label>
      <input v-model.number="attention" type="number" />
      <label>Meditación: </label>
      <input v-model.number="meditation" type="number" />
      <label>Media: </label>
      <input v-model.number="meanVal" readonly type="number" />
      <label>Varianza: </label>
      <input v-model.number="varianceVal" readonly type="number" />
      <label>Dev. Std.: </label>
      <input v-model.number="devStdVal" readonly type="number" />
    </div>
    <div class="chart-wrapper">
      <canvas :id="CHART_DOM_ID"></canvas>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import _ from "lodash";
import Chart from "chart.js/auto";
import axios from "axios";
import { ref } from "vue";
import * as tf from "@tensorflow/tfjs";

const CONSTANTS = {
  CHART_DOM_ID: "data-container",
  DATA_URL: "http://localhost:13854/all", 
  MAX_SAMPLE_COUNT: 10,
  UPDATE_INTERVAL: 2000,
};

const DATASET_NAMES = {
  LowAlpha: "LowAlpha",
  HighAlpha: "HighAlpha",
  LowBeta: "LowBeta",
  HighBeta: "HighBeta",
  LowGamma: "LowGamma",
  HighGamma: "HighGamma",
};

let LIVE_VALUES = {
  ATTENTION: 0,
  MEDITATION: 0,
  MEDIA: 0,
  VARIANZA: 0,
  DEV_STD: 0,
  LIVE_CHART: false,
  STATIC_DATA: [],
  DATA_URL: CONSTANTS.DATA_URL + "?size=" + CONSTANTS.MAX_SAMPLE_COUNT,
};

/* //////////////////////////////////////////////////// */
/* BINDED VALUEs */
let updateInterval = ref(CONSTANTS.UPDATE_INTERVAL);
let sampleCount = ref(CONSTANTS.MAX_SAMPLE_COUNT);

let attention = ref(LIVE_VALUES.ATTENTION);
let meditation = ref(LIVE_VALUES.MEDITATION);
let liveChart = ref(LIVE_VALUES.LIVE_CHART);

let dataUrl = ref(LIVE_VALUES.DATA_URL);

let staticData = ref(LIVE_VALUES.STATIC_DATA);

let meanVal = ref(LIVE_VALUES.MEDIA);
let varianceVal = ref(LIVE_VALUES.VARIANZA);
let devStdVal = ref(LIVE_VALUES.DEV_STD);

/* //////////////////////////////////////////////////// */
/* SUPPORT CLASSES */

const DataSet = function (name, rgbColor) {
  name = name || "Indefinido";
  this.label = name;
  this.data = [];
  this.backgroundColor = "rgba(" + rgbColor + ", 0.2)";
  this.borderColor = "rgba(" + rgbColor + ", 1)";
  this.borderWidth = 1;
  this.fill = "origin";
};

const DataSetData = function (dataSetName, data) {
  this.dataSetName = dataSetName;
  this.data = !!data && Array.isArray(data) ? data : [];
};

const DataSetItem = function (ts, value) {
  this.ts = ts;
  this.value = value;
};

/* //////////////////////////////////////////////////// */

/* EVENTS */

function onChange_SampleCout() {
  dataUrl.value = CONSTANTS.DATA_URL + "?size=" + sampleCount.value;
}

function onChange_FromDisk(e){
  console.log(e);
} 

function onFileReaderLoad(e) {
  staticData.value = JSON.parse(e.target.result);
}

function onChange_JsonFile(e) {
  var reader = new FileReader();
  reader.onload = onFileReaderLoad;
  reader.readAsText(e.srcElement.files[0]);
}

/* //////////////////////////////////////////////////// */

/* METHODS */

function getChart() {
  return Chart.getChart(CONSTANTS.CHART_DOM_ID);
}

function getChartTimeStamps(chart) {
  if (typeof chart == "undefined" || chart == null) chart = getChart();

  let value = _.chain(chart.data.datasets)
    .map((dataSet) => _.map(dataSet.data))
    .flatten()
    .map((data) => data.x)
    .orderBy((ts) => ts.getTime())
    .sortedUniqBy((ts) => ts.getTime())
    .value();

  return value;
}

/* Receives a data collection and ads it to the chart */
function updateChart(data) {
  /* Gets chart by dom id */
  const chart = getChart();

  let dataSetNewData = null;
  let dataSetIndex = null;

  /* Each data object has a DataSet name, used to find the data set in the chart settings */
  for (let i = 0; i < data.length; i++) {
    dataSetNewData = data[i];
    dataSetIndex = _.findIndex(
      chart.data.datasets,
      (chartDataSet) => chartDataSet.label == dataSetNewData.dataSetName
    );

    if (dataSetIndex < 0) {
      console.error("DataSet not found cant update chart");
    }

    /* Each dataSet has a collection of items that has to be added to the dataSet data items */
    chart.data.datasets[dataSetIndex].data = dataSetNewData.data.map(function (
      dataItem
    ) {
      return { x: dataItem.ts, y: dataItem.value };
    });
  }

  /* 
  Searches the timestamps on all of the datasets (x axis value) 
  Orders them and creates an automatic labels collection
  */
  let timeStamps = _.chain(getChartTimeStamps())
    .map((ts) => moment(ts).format("DD/MM/YY HH:mm:ss"))
    .value();

  chart.data.labels = timeStamps;

  chart.update();
}

function setChart(dataSets) {
  let ctx = document.getElementById(CONSTANTS.CHART_DOM_ID).getContext("2d");

  let chartSettings = {
    type: "line",
    data: {
      labels: [],
      datasets: dataSets,
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        yAxes: [
          {
            stacked: true,
          },
        ],
      },
    },
  };

  new Chart(ctx, chartSettings);
}

function addRandomData() {
  const max = 15000;
  const min = 5000;

  let data = [
    new DataSetItem(
      DATASET_NAMES.LowAlpha,
      new DataSetItem(moment()._d, Math.random() * (max - min) + min)
    ),
  ];

  updateChart(data);
}

function processChartRequest(response) {
  if (!!response.data && response.data.length > 0) {
    if (!liveChart.value) {
      sampleCount.value = response.data.length;
    }

    let lowAlpha = new DataSetData(DATASET_NAMES.LowAlpha);
    let highAlpha = new DataSetData(DATASET_NAMES.HighAlpha);
    let lowBeta = new DataSetData(DATASET_NAMES.LowBeta);
    let highBeta = new DataSetData(DATASET_NAMES.HighBeta);
    let lowGamma = new DataSetData(DATASET_NAMES.LowGamma);
    let highGamma = new DataSetData(DATASET_NAMES.HighGamma);

    let samples = [];
    for (let i = 0; i < response.data.length; i++) {
      let data = response.data[i];

      samples.push([
        data.eegPower.lowAlpha,
        data.eegPower.highAlpha,
        data.eegPower.lowBeta,
        data.eegPower.highBeta,
        data.eegPower.lowGamma,
        data.eegPower.highGamma
      ]);

      lowAlpha.data.push(new DataSetItem(moment(data.ts)._d, data.eegPower.lowAlpha));
      highAlpha.data.push(new DataSetItem(moment(data.ts)._d, data.eegPower.highAlpha));
      lowBeta.data.push(new DataSetItem(moment(data.ts)._d, data.eegPower.lowBeta));
      highBeta.data.push(new DataSetItem(moment(data.ts)._d, data.eegPower.highBeta));
      lowGamma.data.push(new DataSetItem(moment(data.ts)._d, data.eegPower.lowGamma));
      highGamma.data.push(new DataSetItem(moment(data.ts)._d, data.eegPower.highGamma));
    }

    updateChart([lowAlpha, highAlpha, lowBeta, highBeta, lowGamma, highGamma]);

    if (response.data.length > 0) {
      let latestData = response.data[response.data.length - 1];
      attention.value = latestData.eSense.attention;
      meditation.value = latestData.eSense.meditation;
    }

    let meanTFVal = null;
    let varianceTFVal = null;
    let devStdTFVal = null;
    tf.tidy(() => {
      const { mean, variance } = tf.moments(samples);
      const devStd = tf.sqrt(variance);

      meanTFVal = mean.dataSync()[0];
      varianceTFVal = variance.dataSync()[0];
      devStdTFVal = devStd.dataSync()[0];
    });

    meanVal.value = parseFloat(meanTFVal.toFixed(2));
    varianceVal.value = parseFloat(varianceTFVal.toFixed(2));
    devStdVal.value = parseFloat(devStdTFVal.toFixed(2));
  }
}

let createRequest;
createRequest = function () {
  if (liveChart.value){
    axios.get(dataUrl.value).then((response) => {
      processChartRequest(response);
      setTimeout(createRequest, updateInterval.value);
    });
  }
  else {
    processChartRequest({ data: staticData.value });
    setTimeout(createRequest, updateInterval.value);
  }
};

/* //////////////////////////////////////////////////// */

/* COMPONENT DEFINITION */

export default {
  mounted() {
    setChart([
      new DataSet(DATASET_NAMES.LowAlpha, "121, 12, 9"),
      new DataSet(DATASET_NAMES.HighAlpha, "255, 0, 0"),
      new DataSet(DATASET_NAMES.LowBeta, "9, 121, 29"),
      new DataSet(DATASET_NAMES.HighBeta, "5, 255, 0"),
      new DataSet(DATASET_NAMES.LowGamma, "9, 9, 121"),
      new DataSet(DATASET_NAMES.HighGamma, "0, 212, 255"),
    ]);
    createRequest();
  },
  setup() {
    return {
      CHART_DOM_ID: CONSTANTS.CHART_DOM_ID,
      addRandomData,
      updateInterval: updateInterval,
      sampleCount,
      attention,
      meditation,
      liveChart,
      meanVal,
      varianceVal,
      devStdVal,
      onChange_FromDisk,
      onChange_JsonFile,
      onChange_SampleCout
    };
  },
};
</script>

<style>
.input-bar {
  margin-top: 5px;
}

.input-bar:first {
  margin-top: 0;
}

input {
  margin-right: 5px;
}

input:last-child {
  margin-right: 0;
}

label {
  font-weight: bold;
}
.chart-wrapper {
  height: calc(100vh - 130px);
  position: relative;
  overflow: hidden;
}
#input-bar, #stats-bar {
  padding-top: 10px;
}

#input-bar > * {
  margin-right: 1vw;
  width: 6vw;
}

#input-bar > #liveChart {
  margin-right: 1vw;
  width: 30px;
}

#input-bar > #jsonFile {
  margin-right: 1vw;
  width: 300px;
}

#stats-bar > input {
  margin-right: 1vw;
  width: 100px;
}

</style>
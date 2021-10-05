<template>
  <div>
    <div id="input-bar">
      <label>Intervalo de actualización (ms): </label>
      <input v-model.number="updateInterval" readonly type="number" />
      <label>Cant. muestras: </label>
      <input v-model.number="sampleCount" @change="onChange_SampleCout" type="number" />
      <label>Atención: </label>
      <input v-model.number="attention" type="number" />
      <label>Meditación: </label>
      <input v-model.number="meditation" type="number" />
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
  DATA_URL: CONSTANTS.DATA_URL + "?size=" + CONSTANTS.MAX_SAMPLE_COUNT,
};

/* //////////////////////////////////////////////////// */
/* BINDED VALUEs */
let updateInterval = ref(CONSTANTS.UPDATE_INTERVAL);
let sampleCount = ref(CONSTANTS.MAX_SAMPLE_COUNT);

let attention = ref(LIVE_VALUES.ATTENTION);
let meditation = ref(LIVE_VALUES.MEDITATION);

let dataUrl = ref(LIVE_VALUES.DATA_URL);

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
    let lowAlpha = new DataSetData(DATASET_NAMES.LowAlpha);
    let highAlpha = new DataSetData(DATASET_NAMES.HighAlpha);
    let lowBeta = new DataSetData(DATASET_NAMES.LowBeta);
    let highBeta = new DataSetData(DATASET_NAMES.HighBeta);
    let lowGamma = new DataSetData(DATASET_NAMES.LowGamma);
    let highGamma = new DataSetData(DATASET_NAMES.HighGamma);

    for (let i = 0; i < response.data.length; i++) {
      let data = response.data[i];

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
  }
}

let createRequest;
createRequest = function () {
  axios.get(dataUrl.value).then((response) => {
    processChartRequest(response);
    setTimeout(createRequest, updateInterval.value);
  });
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
      onChange_SampleCout
    };
  },
};
</script>

<style>
.chart-wrapper {
  height: calc(100vh - 90px);
  position: relative;
  overflow: hidden;
}
#input-bar {
  padding-top: 5px;
}

#input-bar > * {
  margin-right: 1vw;
  width: 8vw;
}
</style>
<template>
  <div id="input-bar">
    <label>Intervalo de actualización: </label>
    <input v-model.number="updateInterval" type="number" />
    <label>Cant. muestras: </label>
    <input v-model.number="sampleCount" type="number" />
  </div>
  <div class="chart-wrapper">
    <canvas :id="CHART_DOM_ID"></canvas>
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
  DATA_URL: "http://localhost:3000/fakeEEG/single",
  MAX_SAMPLE_COUNT: 30,
  UPDATE_INTERVAL: 5000,
};

/* //////////////////////////////////////////////////// */
/* BINDED VALUEs */
let updateInterval = ref(CONSTANTS.UPDATE_INTERVAL);
let sampleCount = ref(CONSTANTS.MAX_SAMPLE_COUNT);

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
  this.data = data;
};

const DataSetItem = function (ts, value) {
  this.ts = ts;
  this.value = value;
};

/* //////////////////////////////////////////////////// */

/* METHODS */

function getChart() {
  return Chart.getChart(CONSTANTS.CHART_DOM_ID);
}

function getChartTimeStamps(chart) {
  if (typeof chart == "undefined" || chart == null) chart = getChart();

  return _.chain(chart.data.datasets)
    .map((dataSet) => _.map(dataSet.data))
    .flatten()
    .map((data) => data.x)
    .orderBy((ts) => ts)
    .sortedUniq()
    .value();
}

function fixXValueCount(offset = 1) {
  let timeStamps = getChartTimeStamps();
  let maxSampleCount = sampleCount.value;
  if (timeStamps.length < maxSampleCount) return;

  let chart = getChart();

  /* Removes only 1, it should remove all the extra samples */
  let countToRemove = timeStamps.length - maxSampleCount + offset;
  if (countToRemove <= 0) return;

  let currentDataSet = null;
  let currentTs = null;
  let tsToRemove = _.slice(timeStamps, 0, countToRemove);

  for (let i = 0; i < tsToRemove.length; i++) {
    currentTs = tsToRemove[i];
    for (let j = 0; j < chart.data.datasets.length; j++) {
      currentDataSet = chart.data.datasets[j];
      for (let k = 0; k < currentDataSet.data.length; k++) {
        if (currentDataSet.data[k].x == currentTs) {
          currentDataSet.data.shift();
          break;
        }
      }
    }
  }
}

/* Receives a data collection and ads it to the chart */
function updateChart(data) {
  /* Gets chart by dom id */
  const chart = getChart();

  let chartNewData = null;
  let dataSetIndex = null;
  let dataItem = null;

  /* Each data object has a DataSet name, used to finde the data set in the chart settings */
  for (let i = 0; i < data.length; i++) {
    chartNewData = data[i];
    dataSetIndex = _.findIndex(
      chart.data.datasets,
      (chartDataSet) => chartDataSet.label == chartNewData.dataSetName
    );

    if (dataSetIndex < 0) {
      console.error("DataSet not found cant update chart");
    }

    /* Fix the ammount of points in chart */
    fixXValueCount();

    /* Each dataSet has a collection of data items that has to be added to the dataSet data items */
    for (let j = 0; j < chartNewData.data.length; j++) {
      dataItem = chartNewData.data[j];
      chart.data.datasets[dataSetIndex].data.push({
        x: dataItem.ts,
        y: dataItem.value,
      });
    }
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
    new DataSetData("Alpha", [
      new DataSetItem(moment()._d, Math.random() * (max - min) + min),
    ]),
  ];

  updateChart(data);
}

function getData() {
  return axios.get(CONSTANTS.DATA_URL);
}

function processChartRequest(response) {
  updateChart([
    new DataSetData("Alpha", [
      new DataSetItem(
        moment(response.data.ts)._d,
        response.data.eegPower.highAlpha
      ),
    ]),
  ]);
}

let createRequest;
createRequest = function () {
  getData().then((response) => {
    processChartRequest(response);
    setTimeout(createRequest, updateInterval.value);
  });
};

function startDataRequest() {
  /* First request is manual and immediate, later will be automatic by interval */
  getData().then(processChartRequest);
  setInterval(() => {
    getData().then(processChartRequest);
  }, updateInterval.value);
}

/* //////////////////////////////////////////////////// */

/* COMPONENT DEFINITION */

export default {
  mounted() {
    setChart([new DataSet("Alpha", "0, 0, 255")]);
    createRequest();
  },
  setup() {
    return {
      CHART_DOM_ID: CONSTANTS.CHART_DOM_ID,
      addRandomData,
      updateInterval: updateInterval,
      sampleCount,
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
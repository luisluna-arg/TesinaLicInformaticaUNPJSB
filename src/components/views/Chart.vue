<template>
  <button v-on:click="addRandomData">Agregar dato de test</button>
  <div class="chart-wrapper">
  <canvas :id="CHART_DOM_ID"></canvas>
  </div>
</template>

<script>
import moment from "moment";
import _ from "lodash";
import Chart from "chart.js/auto";

const CHART_DOM_ID = "data-container";

const DataSet = function (name, rgbColor) {
  name = name || "Indefinido";
  this.label = name;
  this.data = [];
  this.backgroundColor = "rgba(" + rgbColor + ", 0.2)";
  this.borderColor = "rgba(" + rgbColor + ", 1)";
  this.borderWidth = 1;
  this.fill = 'origin';
};

let DataSetData = function (dataSetName, data) {
  this.dataSetName = dataSetName;
  this.data = data;
};

let DataSetItem = function (ts, value) {
  this.ts = ts;
  this.value = value;
};

function updateChart(data) {
  const chart = Chart.getChart(CHART_DOM_ID);

  let dataSet = null;
  let dataSetIndex = null;
  let dataItem = null;
  for (let i = 0; i < data.length; i++) {
    dataSet = data[i];
    dataSetIndex = _.findIndex(
      chart.data.datasets,
      (o) => o.label == dataSet.dataSetName
    );

    for (let j = 0; j < dataSet.data.length; j++) {
      dataItem = dataSet.data[j];
      chart.data.datasets[dataSetIndex].data.push({
        x: dataItem.ts,
        y: dataItem.value,
      });
    }
  }

  let timeStamps = _.chain(chart.data.datasets)
    .map((dataSet) => _.map(dataSet.data))
    .flatten()
    .map((data) => data.x)
    .orderBy((ts) => ts)
    .sortedUniq()
    .map((ts) => moment(ts).format("DD/MM/YY HH:mm:ss"))
    .value();

  chart.data.labels = timeStamps;

  chart.update();
}

function setChart(dataSets) {
  let ctx = document.getElementById(CHART_DOM_ID).getContext("2d");

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

  console.clear();

  let data = [
    new DataSetData("Alpha", [
      new DataSetItem(moment()._d, Math.random() * (max - min) + min),
    ]),
  ];

  updateChart(data);
}

export default {
  mounted() {
    setChart([new DataSet("Alpha", "0, 0, 255")]);
  },
  setup() {
    return {
      CHART_DOM_ID,
      addRandomData,
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
</style>
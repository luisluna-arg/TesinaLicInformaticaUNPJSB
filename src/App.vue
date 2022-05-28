<template>
  <Toolbar />
  <Chart />
</template>

<script>
import Toolbar from "./components/views/Toolbar";
import Chart from "./components/views/Chart";

export default {
  name: 'App',
  components: {
    Toolbar,
    Chart
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>

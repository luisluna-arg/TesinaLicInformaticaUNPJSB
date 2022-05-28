<template>
  <div>
    <Toolbar />
    <Board />
  </div>
</template>

<script>
import Toolbar from "./components/Views/Toolbar.vue";
import Board from "./components/Views/Board.vue";

export default {
  name: "App",
  components: {
    Toolbar,
    Board,
  },
};
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

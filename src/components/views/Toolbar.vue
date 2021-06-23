<template>
  <div class="toolbar" role="banner">
    <img width="40" alt="Laberinto" src="./../../assets/logo.png" />
    <span>Live chart</span>
    <div class="spacer"></div>
  </div>
</template>

<script>
export default {};
</script>

<style>
.spacer {
  flex: 1;
}

.toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  display: flex;
  align-items: center;
  background-image: linear-gradient(#41b883, #1d6e4a);
  color: white;
  font-weight: 600;
}

.toolbar img {
  margin: 0 16px;
}

.toolbar #twitter-logo {
  height: 40px;
  margin: 0 16px;
}

.toolbar #twitter-logo:hover {
  opacity: 0.8;
}
</style>
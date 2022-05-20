<template>
  <div id="board-inner-wrapper">
    <div>
      <label>Lectura en vivo: </label>
      <input type="checkbox" id="activateRead" v-model="activateReading" />
      <label style="margin-left:10px">URL Servidor: </label>
      <input type="text" id="serverURL" v-model="serverURL" />
    </div>
    <div class="content-row">
      <div class="board">
        <div
          class="row"
          v-for="(Row, rowIndex) in CellMatrix"
          :key="rowIndex"
          :value="Row.length"
          ref="rows"
        >
          <div class="col" v-for="(Cell, colIndex) in Row" :key="colIndex">
            <Cell
              :Row="rowIndex"
              :Column="colIndex"
              :IsFirstRow="rowIndex == 0"
              :IsLastRow="rowIndex == Rows - 1"
              :IsFirstColumn="colIndex == 0"
              :IsLastColumn="colIndex == Columns - 1"
              :Cell="Cell"
            />
          </div>
        </div>
      </div>
      <div class="content-column">
        <input id="current-move" type="text" v-model="currentMove" />
        <video id="video" height="320" autoplay />
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from "vue";
import Cell from "./Cell.vue";
import axios from "axios";

const CONSTANTS = {
  SERVER_URL: "http://localhost:13854/",
  DATA_METHOD: "all",
  DIRECTION_METHOD: "getDirection",
  UPDATE_INTERVAL: 1000,
};

const Direction = {
  Up: 0,
  Down: 1,
  Left: 2,
  Right: 3,
};

const MOVE_TYPE = {
  NONE: 0,
  DOWN: 1,
  UP: 2,
  LEFT: 3,
  RIGHT: 4,
};

const _Rows = 10;
const _Columns = 10;

let LIVE_VALUES = {
  SERVER_URL: CONSTANTS.SERVER_URL, //+ "?size=" + CONSTANTS.MAX_SAMPLE_COUNT,
  ACTIVATE_READ: false,
  CURRENT_MOVE: "Sin movimiento",
};

let serverURL = ref(LIVE_VALUES.SERVER_URL);
let activateReading = ref(LIVE_VALUES.ACTIVATE_READING);
let currentMove = ref(LIVE_VALUES.CURRENT_MOVE);

/* Contains the definition for special cells */
const _Cells = {
  path: [
    [1, 0],
    [1, 1],
    [1, 2],
    [1, 3],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 2],
    [4, 3],
    [4, 4],
    [4, 6],
    [4, 7],
    [4, 8],
    [5, 2],
    [5, 6],
    [5, 8],
    [6, 2],
    [6, 3],
    [6, 4],
    [6, 5],
    [6, 6],
    [6, 8],
    [7, 8],
    [8, 5],
    [8, 6],
    [8, 7],
    [8, 8],
    [9, 5],
  ],
  empty: [
    [1, 5],
    [1, 6],
    [1, 7],
    [2, 6],
    [2, 8],
    [3, 1],
    [3, 2],
    [3, 8],
    [5, 1],
    [5, 4],
    [7, 3],
    [8, 1],
    [8, 2],
    [8, 3],
  ],
  finishingLine: [9, 5],
};

const BoardCell = function (isPath, isEmpty, row, col, hasPointer) {
  let self = this;
  /* Properties */
  self.IsPath = isPath;
  self.IsEmpty = isEmpty;
  self.Row = row;
  self.Column = col;
  self.HasPointer = hasPointer;

  /* Methods */
  self.sameCoordinates = (coordinates) => {
    return self.Row === coordinates[0] && self.Column === coordinates[1];
  };
  self.getCoordinates = () => {
    return [self.Row, self.Column];
  };
};

function dispatchKeyEvent(key) {
  let event = new KeyboardEvent("keyup", {
    bubbles: true,
    cancelable: true,
    key: key,
  });
  window.dispatchEvent(event);
}

function processDirectionRequest(response) {
  const data = parseInt(response.data);
  if (typeof data != "undefined" && data != null) {
    switch (data) {
      case MOVE_TYPE.DOWN: {
        dispatchKeyEvent("ArrowDown");
        currentMove.value = "Abajo";
        console.log(`Abajo (${data})`);
        break;
      }
      case MOVE_TYPE.UP: {
        dispatchKeyEvent("ArrowUp");
        currentMove.value = "Arriba";
        console.log(`Arriba (${data})`);
        break;
      }
      case MOVE_TYPE.LEFT: {
        dispatchKeyEvent("ArrowLeft");
        currentMove.value = "Izquierda";
        console.log(`Izquierda (${data})`);
        break;
      }
      case MOVE_TYPE.RIGHT: {
        dispatchKeyEvent("ArrowRight");
        currentMove.value = "Derecha";
        console.log(`Derecha (${data})`);
        break;
      }
      default: {
        /* No hacer nada */
        currentMove.value = "Sin movimiento";
        break;
      }
    }
  }
}

// Start Cam function
const startCam = () => {
  //Initialize video
  const video = document.getElementById("video");
  console.log("video", video);

  // validate video element
  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        video.srcObject = stream;
      })
      .catch(function (error) {
        console.log("Something went wrong!");
        console.log(error);
      });
  }
};

let createRequest;
createRequest = function () {
  if (activateReading.value) {
    try {
      let url = serverURL.value + CONSTANTS.DATA_METHOD;
      axios.get(url).then((response) => {
        processDirectionRequest(response);
      });
    } catch (error) {
      console.error("Communication error: " + error);
    }

    setTimeout(createRequest, CONSTANTS.UPDATE_INTERVAL);
  } else {
    setTimeout(createRequest, CONSTANTS.UPDATE_INTERVAL);
  }
};

export default {
  components: {
    Cell,
  },
  mounted() {
    // let componentProxy = this;
    // window.addEventListener("keyup", function (s) {
    //   if (s.key === "ArrowRight") return componentProxy.onKeyUp_Right();
    //   if (s.key === "ArrowLeft") return componentProxy.onKeyUp_Left();
    //   if (s.key === "ArrowUp") return componentProxy.onKeyUp_Up();
    //   if (s.key === "ArrowDown") return componentProxy.onKeyUp_Down();
    // });
    createRequest();

    startCam();
  },
  setup() {
    let pointerPosition = ref(_Cells.path[0]);
    let isFinished = ref(false);

    let CellMatrix = [];

    const getCell = (position, y) => {
      let realValue = position;

      /* Is position undefined? */
      if (typeof realValue === "undefined" || realValue === null) return null;

      /* Is position a reference value? */
      if (typeof position.value !== "undefined" && position.value !== null) {
        /* Re assign it */
        realValue = position.value;
      }

      /* Is real value defined? */
      if (typeof realValue === "undefined" || realValue === null) {
        return null;
      }

      /* Is the real value an array? */
      if (typeof realValue.length !== "undefined" && realValue.value !== null) {
        return CellMatrix[realValue[0]][realValue[1]];
      }

      /* Real value should be an "x" coordinate */
      let x = realValue;

      /* Is "y" coordinate defined or not a number? */
      if (typeof y !== "undefined" && y !== null && !isNaN(y)) {
        return CellMatrix[x][y];
      }

      /* Unable to return result */
      return null;
    };

    const clearPointer = () => {
      let cell = getCell(pointerPosition);

      if (cell !== null) {
        cell.value.HasPointer = false;
      }
    };

    let move = (direction) => {
      /* If the game is finished wait for it to reboot */
      if (isFinished.value) return false;

      if (
        pointerPosition.value[0] == _Cells.finishingLine[0] &&
        pointerPosition.value[0] == _Cells.finishingLine[1]
      )
        return false;

      let cell = null;
      let y = pointerPosition.value[1];
      let x = pointerPosition.value[0];
      if (direction == Direction.Up || direction == Direction.Down) {
        if (direction == Direction.Up && x - 1 >= 0) x = x - 1;
        else if (x + 1 < _Rows) x = x + 1;
      } else {
        if (direction == Direction.Left && y - 1 >= 0) y = y - 1;
        else if (direction == Direction.Right && y + 1 < _Columns) y = y + 1;
      }

      cell = getCell(x, y);

      /* Check if next cell is a path cell, if not cancel the movement */
      if (cell == null || (!cell.value.IsPath && !cell.value.IsEmpty))
        return false;

      /* Next cell is a path cell, move to it */
      clearPointer();
      pointerPosition.value = cell.value.getCoordinates();
      cell.value.HasPointer = true;

      if (
        cell.value.sameCoordinates(_Cells.finishingLine) &&
        !isFinished.value
      ) {
        /* Game is finished, set the flag and wait for the pointer reboot */
        isFinished.value = true;

        setTimeout(() => {
          /* Set timeout for a message display and a pointer reboot */
          alert("Llegaste a la meta!! Felicidades!!");

          /* Game finished, move to the first cell */
          let firstCell = getCell(_Cells.path[0]);

          clearPointer();
          pointerPosition.value = firstCell.value.getCoordinates();
          firstCell.value.HasPointer = true;

          isFinished.value = false;
        }, 250);
      }

      return true;
    };

    let Board = {
      Rows: _Rows,
      Columns: _Columns,
      CellCount: _Rows * _Columns,
      activateReading,
      currentMove,
      serverURL,
      onKeyUp_Up: () => move(Direction.Up),
      onKeyUp_Down: () => move(Direction.Down),
      onKeyUp_Left: () => move(Direction.Left),
      onKeyUp_Right: () => move(Direction.Right),
    };

    for (let row = 0; row < Board.Rows; row++) {
      CellMatrix[row] = [];
      for (let col = 0; col < Board.Columns; col++) {
        let isPath =
          _Cells.path.filter(
            (coord) => row == coord[(0, 0)] && col == coord[(0, 1)]
          ).length > 0;
        let isEmpty =
          _Cells.empty.filter(
            (coord) => row == coord[(0, 0)] && col == coord[(0, 1)]
          ).length > 0;

        CellMatrix[row][col] = ref(
          new BoardCell(
            isPath,
            isEmpty,
            row,
            col,
            isPath &&
              row == pointerPosition.value[0] &&
              col == pointerPosition.value[1]
          )
        );
      }
    }

    Board.CellMatrix = CellMatrix;

    return Board;
  },
};
</script>

<style>
#video {
  margin-left: 10px;
  border: 2px solid black;
  -webkit-transform: scaleX(-1);
  transform: scaleX(-1);
}

#current-move {
  margin-bottom: 10px;
}

.content-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  vertical-align: top;
}

.content-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  vertical-align: top;
}

.board {
  display: block;
}

#board-inner-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.row {
  display: flex;
  flex-direction: row;
}
</style>
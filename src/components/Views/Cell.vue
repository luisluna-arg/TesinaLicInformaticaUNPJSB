<template>
  <div
    class="cell -striped-bgs-nine"
    :class="{
      path: IsPath,
      empty: IsEmpty,
      'outer-border': IsOuter,
      'top-border': IsOuter && IsFirstRow,
      'bottom-border': IsOuter && IsLastRow,
      'left-border': IsOuter && IsFirstColumn,
      'right-border': IsOuter && IsLastColumn,
      'has-pointer': Cell.value.HasPointer,
    }"
    @click="CellClick"
  >
    <span class="hidden-text">({{ Row }}, {{ Column }})</span>
  </div>
</template>

<script>
import { ref } from "vue";

export default {
  props: {
    Row: { type: Number, default: 0 },
    Column: { type: Number, default: 0 },
    Cell: { type: Object, default: null },
    IsFirstRow: { type: Boolean, default: false },
    IsLastRow: { type: Boolean, default: false },
    IsFirstColumn: { type: Boolean, default: false },
    IsLastColumn: { type: Boolean, default: false },
    HasPointer: { type: Boolean, default: false },
  },
  setup(props) {
    let cellNumber = ref(1);
    let cellValue = ref(
      props.Cell.value != null
        ? props.Cell.value.Data + " " + cellNumber.value
        : "NULL"
    );

    // console.log(props);

    return {
      Data: props.Cell.value.IsPath ? "" : cellValue,
      IsPath: props.Cell.value.IsPath,
      IsEmpty: props.Cell.value.IsEmpty,
      IsOuter:
        props.IsFirstRow ||
        props.IsLastRow ||
        props.IsFirstColumn ||
        props.IsLastColumn,
      CellClick: () => {
        cellNumber.value += 1;
        cellValue.value =
          props.Cell.value != null
            ? props.Cell.value.Data + " " + cellNumber.value
            : "NULL";
      },
    };
  },
};
</script>

<style>
.cell {
  width: 2.9vw;
  height: 3vw;
  align-items: center;
  justify-content: center;
  display: flex;
  color: black;
  background-color: lightcoral;
}

.path {
  background-color: white; /*green;*/
  background-image: none;
}
.empty {
  background-color: white; /*blue;*/
  background-image: none;
}
.outer-border {
  border-color: green;
  border-style: double;
  border-width: 0px;
  width: 2.9vw;
}
.left-border {
  border-left-width: 1px;
  border-right: 0;
}
.right-border {
  border-right-width: 1px;
  border-left: 0;
}
.top-border {
  border-top-width: 1px;
  border-bottom: 0;
}
.bottom-border {
  border-bottom-width: 1px;
  border-top: 0;
}
.has-pointer {
  background-color: greenyellow;
}
.hidden-text {
  opacity: 0;
}
</style>
/* HELPER FUNCTIONS */
/* //////////////// */

const printHeader = function (header) {
    console.log("");
    console.log(header);
    console.log(new Array(header.length).fill("=").join(''));
}

const printSubHeader = function (subheader) {
    console.log("");
    console.log("> " + subheader);
}

const isNullOrUndef = function (value) {
    return value === null || value === undefined;
    // return typeof value == 'undefined' || value == null;
}


function getArrayShape(array) {
    if (isNullOrUndef(array)) throw 'Array is not valid';
    return [array.length, array.length > 0 ? Array.isArray(array[0]) ? array[0].length : 1 : 1];
}

function trunc(value, decimals) {
    const defaultDecimals = 5;
    if (isNullOrUndef(decimals)) {
        decimals = defaultDecimals;
    }

    return parseFloat(value.toFixed(decimals));
}


module.exports = {
    printHeader,
    printHeader,
    getArrayShape,
    isNullOrUndef,
    trunc
}
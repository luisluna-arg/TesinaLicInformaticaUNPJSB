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

function readDataSetCSV(filePath) {
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
        let fileData = fs.readFileSync(filePath, { encoding: 'utf-8' });
        let result = fileData.split(';').
            map(l => l.split(',').
            map(v => (v.indexOf('.') >= 0) ? parseFloat(v) : parseInt(v)));

        
        return result;
    }
    else {
        throw 'Archivo no encontrado';
    }
}

function writeDataSetCSV(filePath, dataCollection) {
    const fs = require('fs');
    if (fs.existsSync(filePath) && fs.accessSync(filePath)) {
        fs.unlink(filePath);
    }

    fs.writeFileSync(filePath, dataCollection.map((c, i) => c.join(',')).join(';') + '\n', { encoding: 'utf-8' });
}


function readJSON(filePath) {
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
        let fileData = fs.readFileSync(filePath, { encoding: 'utf-8' });
        let result = JSON.parse(fileData);
        return result;
    }
    else {
        throw 'Archivo no encontrado';
    }
}

function writeJSON(filePath, jsonData) {
    const fs = require('fs');
    if (fs.existsSync(filePath) && fs.accessSync(filePath)) {
        fs.unlink(filePath);
    }

    fs.writeFileSync(filePath, JSON.stringify(jsonData), { encoding: 'utf-8' });
}

/* /////////////////////////////////////////////////////////////////// */

module.exports = {
    printHeader,
    printSubHeader,
    getArrayShape,
    isNullOrUndef,
    trunc,
    readDataSetCSV,
    writeDataSetCSV,
    readJSON,
    writeJSON
}
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore/lite');
const { firebaseConfig } = require("../config/firebase.config.js");

const app = initializeApp(firebaseConfig);
const database = getFirestore(app);

let firestore = {
    save: (data, label, ts) => {
        setDoc(doc(database, label, ts), data);
    },
    saveModel: (model, modelLabel) => {
        setDoc(doc(database, modelLabel), model);
    }
}

module.exports = firestore;
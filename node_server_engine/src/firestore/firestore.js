import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore/lite';
import { firebaseConfig } from "../config/firebase.config.js"

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
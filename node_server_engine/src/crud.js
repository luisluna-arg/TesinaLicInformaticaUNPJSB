import {createClient} from "./lib/index.js";
import {initializeApp} from 'firebase/app';
import {getFirestore, doc, setDoc} from 'firebase/firestore/lite';
import {firebaseConfig} from "./config/firebase.config.js"

const app = initializeApp(firebaseConfig);
const database = getFirestore(app);


const client = createClient();
client.on("data", (sensedData) => {
    let sample = {
        ts: (new Date).toISOString()
    };
     setDoc(doc(database, "freq", sample.ts), { ...sample, ...sensedData });
});
client.connect();
import { initializeApp } from "firebase/app";
import {
    getDatabase,
    ref,
    push,
    onValue,
    set,
    get,
    update // ✅ Add these
  } from "firebase/database";
  
const firebaseConfig = {

    apiKey: "AIzaSyC54DigdxON6xTH7zXQQYpsC2KMH46IhTw",
    authDomain: "sira-whoami.firebaseapp.com",
    databaseURL: "https://sira-whoami-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "sira-whoami",
    storageBucket: "sira-whoami.firebasestorage.app",
    messagingSenderId: "1097108171583",
    appId: "1:1097108171583:web:567b3226f65bc3ff0c018a",
    measurementId: "G-4FWQH6PR6F"
  };
  

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, push, onValue, set, get, update };

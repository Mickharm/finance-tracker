import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAZwgJfZqiej9DOl42a2pLoN7sio3dr9vk",
  authDomain: "accounting-assistant-12f5f.firebaseapp.com",
  projectId: "accounting-assistant-12f5f",
  storageBucket: "accounting-assistant-12f5f.firebasestorage.app",
  messagingSenderId: "334790576786",
  appId: "1:334790576786:web:61f27c567113f70a3bf44b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Persistent local cache: onSnapshot serves cached docs from IndexedDB instantly
// on app restart, then syncs from the server in the background. This is the main
// reason cold-starts can show the home screen near-instantly.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
const appId = 'finance-tracker-production';
const LEDGER_ID = 'Mick';

export { auth, db, appId, LEDGER_ID };

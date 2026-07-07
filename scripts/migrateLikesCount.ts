#!/usr/bin/env ts-node

import { config } from 'dotenv';
config();

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, doc, updateDoc, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MOVIES_COLLECTION = 'movies';
const EPISODES_SERIES_COLLECTION = 'episodesSeries';
const LIKES_COLLECTION = 'like';
const BATCH_SIZE = 500;

async function migrate() {
  console.log('Reading all likes...');
  const likesSnap = await getDocs(collection(db, LIKES_COLLECTION));

  const likesMap = new Map<string, number>();
  likesSnap.docs.forEach(doc => {
    const like = doc.data();
    const uid = like.uid;
    if (uid) {
      likesMap.set(uid, (likesMap.get(uid) || 0) + 1);
    }
  });

  console.log(`Found ${likesMap.size} unique items with likes.`);

  let updated = 0;

  for (const [uid, count] of likesMap) {
    const movieQuery = query(collection(db, MOVIES_COLLECTION), where('uid', '==', uid), limit(1));
    const movieSnap = await getDocs(movieQuery);

    if (!movieSnap.empty) {
      const ref = doc(db, MOVIES_COLLECTION, movieSnap.docs[0].id);
      await updateDoc(ref, { likesCount: count });
      updated++;
      console.log(`Movie ${uid}: likesCount = ${count}`);
      continue;
    }

    const episodeQuery = query(collection(db, EPISODES_SERIES_COLLECTION), where('uid_episode', '==', uid), limit(1));
    const episodeSnap = await getDocs(episodeQuery);

    if (!episodeSnap.empty) {
      const ref = doc(db, EPISODES_SERIES_COLLECTION, episodeSnap.docs[0].id);
      await updateDoc(ref, { likesCount: count });
      updated++;
      console.log(`Episode ${uid}: likesCount = ${count}`);
    } else {
      console.warn(`UID ${uid} not found in movies or episodes — skipping.`);
    }
  }

  console.log(`Done. Updated ${updated} documents.`);
}

migrate().catch(console.error);

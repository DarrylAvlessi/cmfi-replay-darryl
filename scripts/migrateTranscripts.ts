#!/usr/bin/env ts-node

import { config } from 'dotenv';
config();

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteField } from 'firebase/firestore';

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

const EPISODES_SERIES_COLLECTION = 'episodesSeries';
const EPISODE_TRANSCRIPTS_COLLECTION = 'episodeTranscripts';
const BATCH_SIZE = 500;

async function migrate() {
  console.log('Reading all episodes...');
  const episodesSnap = await getDocs(collection(db, EPISODES_SERIES_COLLECTION));

  const toMigrate: { id: string; uid_episode: string; TranscriptText: string }[] = [];

  episodesSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    if (data.TranscriptText && data.uid_episode) {
      toMigrate.push({
        id: docSnap.id,
        uid_episode: data.uid_episode,
        TranscriptText: data.TranscriptText,
      });
    }
  });

  console.log(`Found ${toMigrate.length} episodes with TranscriptText.`);

  let migrated = 0;

  for (let i = 0; i < toMigrate.length; i += BATCH_SIZE) {
    const batch = toMigrate.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (item) => {
      const transcriptRef = doc(db, EPISODE_TRANSCRIPTS_COLLECTION, item.uid_episode);
      await setDoc(transcriptRef, { TranscriptText: item.TranscriptText });

      const episodeRef = doc(db, EPISODES_SERIES_COLLECTION, item.id);
      await updateDoc(episodeRef, { TranscriptText: deleteField() });

      migrated++;
      if (migrated % 100 === 0) {
        console.log(`Migrated ${migrated}/${toMigrate.length}...`);
      }
    }));
    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} complete.`);
  }

  console.log(`Done. Migrated ${migrated} transcripts.`);
}

migrate().catch(console.error);

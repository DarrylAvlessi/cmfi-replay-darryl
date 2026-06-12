#!/usr/bin/env ts-node

/**
 * Script TypeScript pour mettre à jour les statistiques pré-calculées des séries
 * Résout le problème N+1 queries en pré-calculant seasonsCount, episodesCount et totalDuration
 * 
 * Usage:
 * npx ts-node scripts/updateSeriesStats.ts --all          # Mettre à jour toutes les séries
 * npx ts-node scripts/updateSeriesStats.ts --uid XXXX    # Mettre à jour une série spécifique
 * npx ts-node scripts/updateSeriesStats.ts --check        # Vérifier les séries sans stats
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, Timestamp, limit } from 'firebase/firestore';
import { serieService } from '../lib/db';

// Configuration Firebase (utiliser les mêmes configs que l'app)
const firebaseConfig = {
  // Copier la configuration depuis firebase.ts ou utiliser les variables d'environnement
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Vérifie les séries qui n'ont pas de stats pré-calculées
 */
async function checkSeriesWithoutStats(): Promise<void> {
  try {
    console.log('🔍 Vérification des séries sans stats pré-calculées...');
    
    const allSeries = await serieService.getAllSeriesOnly();
    
    const seriesWithoutStats = allSeries.filter(serie => 
      serie.seasonsCount === undefined || 
      serie.episodesCount === undefined ||
      serie.statsUpdatedAt === undefined
    );
    
    console.log(`📊 Résultats:`);
    console.log(`   - Total séries: ${allSeries.length}`);
    console.log(`   - Séries sans stats: ${seriesWithoutStats.length}`);
    console.log(`   - Séries avec stats: ${allSeries.length - seriesWithoutStats.length}`);
    
    if (seriesWithoutStats.length > 0) {
      console.log('\n⚠️ Séries nécessitant une mise à jour:');
      seriesWithoutStats.forEach(serie => {
        console.log(`   - ${serie.title_serie} (${serie.uid_serie})`);
      });
      
      console.log('\n💡 Pour mettre à jour ces séries, exécutez:');
      console.log('   npx ts-node scripts/updateSeriesStats.ts --all');
    } else {
      console.log('\n✅ Toutes les séries ont des stats pré-calculées!');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    process.exit(1);
  }
}

/**
 * Fonction principale
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const param = args[1];
  
  switch (command) {
    case '--all':
      console.log('🔄 Lancement de la mise à jour de toutes les séries...');
      await serieService.updateAllSeriesStats();
      break;
      
    case '--uid':
      if (!param) {
        console.error('❌ Veuillez spécifier un UID de série: --uid XXXX');
        process.exit(1);
      }
      console.log(`🔄 Lancement de la mise à jour de la série ${param}...`);
      await serieService.calculateAndUpdateSeriesStats(param);
      break;
      
    case '--check':
      await checkSeriesWithoutStats();
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('   npx ts-node scripts/updateSeriesStats.ts --all          # Mettre à jour toutes les séries');
      console.log('   npx ts-node scripts/updateSeriesStats.ts --uid XXXX    # Mettre à jour une série spécifique');
      console.log('   npx ts-node scripts/updateSeriesStats.ts --check        # Vérifier les séries sans stats');
      process.exit(0);
  }
}

// Gérer les erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Lancer le script
if (require.main === module) {
  main();
}

export { checkSeriesWithoutStats };

#!/usr/bin/env node
/**
 * Test Strategy Validation
 *
 * Tests 3 critical hypotheses:
 * 1. dirForAssetWrites empty/null disables image writing
 * 2. Parent call that fails still writes ALL images
 * 3. Timing of image writing after failure
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const MCP_SERVER_URL = 'http://host.docker.internal:3845/mcp';
const ASSETS_DIR = path.join(__dirname, '..', 'tmp', 'test-assets');
const TEST_NODE_ID = process.argv[2]; // Passer en argument

if (!TEST_NODE_ID) {
  console.error('Usage: node test-strategy.js <nodeId>');
  console.error('Example: node test-strategy.js 201:14305');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function cleanAssetsDir() {
  if (fs.existsSync(ASSETS_DIR)) {
    fs.rmSync(ASSETS_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  console.log(`✅ Cleaned ${ASSETS_DIR}`);
}

function countImages() {
  if (!fs.existsSync(ASSETS_DIR)) return 0;
  const files = fs.readdirSync(ASSETS_DIR);
  return files.filter(f => /\.(png|svg|jpg|jpeg|gif|webp)$/i.test(f)).length;
}

function listImages() {
  if (!fs.existsSync(ASSETS_DIR)) return [];
  const files = fs.readdirSync(ASSETS_DIR);
  return files.filter(f => /\.(png|svg|jpg|jpeg|gif|webp)$/i.test(f));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════
// MCP CLIENT SETUP
// ═══════════════════════════════════════════════════════════════

async function createMCPClient() {
  const client = new Client({
    name: 'test-strategy-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  const transport = new StreamableHTTPClientTransport(
    new URL(MCP_SERVER_URL)
  );

  await client.connect(transport);
  console.log('✅ Connected to MCP server\n');

  return client;
}

async function callMCPTool(client, toolName, args) {
  const result = await client.callTool({
    name: `mcp__figma-desktop__${toolName}`,
    arguments: args
  });
  return result;
}

// ═══════════════════════════════════════════════════════════════
// TEST 1: dirForAssetWrites empty/null
// ═══════════════════════════════════════════════════════════════

async function test1_dirForAssetWritesEmpty(client) {
  console.log('═══════════════════════════════════════════════════════');
  console.log('TEST 1: dirForAssetWrites vide/null désactive-t-il images ?');
  console.log('═══════════════════════════════════════════════════════\n');

  // Test A: dirForAssetWrites vide
  console.log('Test 1A: dirForAssetWrites = "" (vide)');
  cleanAssetsDir();

  try {
    const result = await callMCPTool(client, 'get_design_context', {
      nodeId: TEST_NODE_ID,
      clientLanguages: 'javascript,typescript',
      clientFrameworks: 'react',
      dirForAssetWrites: '', // VIDE
      forceCode: true
    });

    const code = result.content[0].text;
    console.log(`✅ Code généré: ${code.length} chars`);

    // Attendre 5s pour voir si des images sont écrites
    await sleep(5000);
    const imageCount = countImages();
    console.log(`📊 Images écrites: ${imageCount}`);

    if (imageCount === 0) {
      console.log('✅ TEST 1A RÉUSSI: dirForAssetWrites vide = pas d\'images\n');
    } else {
      console.log('❌ TEST 1A ÉCHOUÉ: Images écrites malgré dirForAssetWrites vide\n');
    }
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}\n`);
  }

  // Test B: dirForAssetWrites null
  console.log('Test 1B: dirForAssetWrites = null');
  cleanAssetsDir();

  try {
    const result = await callMCPTool(client, 'get_design_context', {
      nodeId: TEST_NODE_ID,
      clientLanguages: 'javascript,typescript',
      clientFrameworks: 'react',
      dirForAssetWrites: null, // NULL
      forceCode: true
    });

    const code = result.content[0].text;
    console.log(`✅ Code généré: ${code.length} chars`);

    await sleep(5000);
    const imageCount = countImages();
    console.log(`📊 Images écrites: ${imageCount}`);

    if (imageCount === 0) {
      console.log('✅ TEST 1B RÉUSSI: dirForAssetWrites null = pas d\'images\n');
    } else {
      console.log('❌ TEST 1B ÉCHOUÉ: Images écrites malgré dirForAssetWrites null\n');
    }
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}\n`);
  }

  // Test C: Paramètre omis
  console.log('Test 1C: dirForAssetWrites omis (pas dans params)');
  cleanAssetsDir();

  try {
    const result = await callMCPTool(client, 'get_design_context', {
      nodeId: TEST_NODE_ID,
      clientLanguages: 'javascript,typescript',
      clientFrameworks: 'react',
      // dirForAssetWrites: OMIS
      forceCode: true
    });

    const code = result.content[0].text;
    console.log(`✅ Code généré: ${code.length} chars`);

    await sleep(5000);
    const imageCount = countImages();
    console.log(`📊 Images écrites: ${imageCount}`);

    if (imageCount === 0) {
      console.log('✅ TEST 1C RÉUSSI: Paramètre omis = pas d\'images\n');
    } else {
      console.log('❌ TEST 1C ÉCHOUÉ: Images écrites malgré paramètre omis\n');
    }
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}\n`);
  }

  console.log('═══════════════════════════════════════════════════════\n');
}

// ═══════════════════════════════════════════════════════════════
// TEST 2: Images récupérées même si code échoue
// ═══════════════════════════════════════════════════════════════

async function test2_imagesOnFailure(client) {
  console.log('═══════════════════════════════════════════════════════');
  console.log('TEST 2: Images récupérées même si code trop gros ?');
  console.log('═══════════════════════════════════════════════════════\n');

  cleanAssetsDir();

  console.log(`Appel get_design_context sur node ${TEST_NODE_ID}...`);

  try {
    const result = await callMCPTool(client, 'get_design_context', {
      nodeId: TEST_NODE_ID,
      clientLanguages: 'javascript,typescript',
      clientFrameworks: 'react',
      dirForAssetWrites: ASSETS_DIR,
      forceCode: true
    });

    const code = result.content[0].text;
    console.log(`✅ Code récupéré: ${code.length} chars`);

    // Attendre que les images soient écrites
    console.log('⏳ Attente 10s pour écriture des images...');
    await sleep(10000);

    const imageCount = countImages();
    const images = listImages();
    console.log(`📊 Images écrites: ${imageCount}`);
    images.forEach(img => console.log(`   - ${img}`));

    console.log('\n✅ TEST 2: Mode simple réussi (code récupéré)');
    console.log(`   ${imageCount} images disponibles\n`);

  } catch (error) {
    console.log(`❌ Code a échoué: ${error.message}`);

    // Attendre et compter les images
    console.log('⏳ Vérification si les images sont quand même écrites...');
    await sleep(10000);

    const imageCount = countImages();
    const images = listImages();
    console.log(`📊 Images écrites malgré l'échec: ${imageCount}`);
    images.forEach(img => console.log(`   - ${img}`));

    if (imageCount > 0) {
      console.log('\n✅ TEST 2 RÉUSSI: Images récupérées même si code a échoué !');
      console.log(`   ${imageCount} images disponibles\n`);
    } else {
      console.log('\n❌ TEST 2 ÉCHOUÉ: Aucune image récupérée après échec\n');
    }
  }

  console.log('═══════════════════════════════════════════════════════\n');
}

// ═══════════════════════════════════════════════════════════════
// TEST 3: Timing d'écriture des images
// ═══════════════════════════════════════════════════════════════

async function test3_imageTiming(client) {
  console.log('═══════════════════════════════════════════════════════');
  console.log('TEST 3: Timing d\'écriture des images');
  console.log('═══════════════════════════════════════════════════════\n');

  cleanAssetsDir();

  console.log(`Appel get_design_context sur node ${TEST_NODE_ID}...`);
  const startTime = Date.now();

  let codeReceived = false;
  let codeTime = 0;

  try {
    const result = await callMCPTool(client, 'get_design_context', {
      nodeId: TEST_NODE_ID,
      clientLanguages: 'javascript,typescript',
      clientFrameworks: 'react',
      dirForAssetWrites: ASSETS_DIR,
      forceCode: true
    });

    codeTime = Date.now() - startTime;
    codeReceived = true;
    console.log(`✅ Code reçu après ${(codeTime / 1000).toFixed(1)}s`);

  } catch (error) {
    codeTime = Date.now() - startTime;
    console.log(`❌ Code échoué après ${(codeTime / 1000).toFixed(1)}s: ${error.message}`);
  }

  // Surveiller les images pendant 30s
  console.log('\n⏳ Surveillance de l\'écriture des images (30s)...\n');

  const timeline = [];
  let previousCount = 0;

  for (let t = 1; t <= 30; t++) {
    await sleep(1000);
    const imageCount = countImages();

    if (imageCount !== previousCount) {
      const elapsed = (t * 1000 + codeTime) / 1000;
      timeline.push({
        time: elapsed,
        count: imageCount,
        delta: imageCount - previousCount
      });
      console.log(`T+${elapsed.toFixed(1)}s: ${imageCount} images (+${imageCount - previousCount})`);
      previousCount = imageCount;
    }
  }

  console.log('\n📊 Timeline d\'écriture:');
  console.log(`   Code reçu: T+${(codeTime / 1000).toFixed(1)}s`);
  timeline.forEach(entry => {
    console.log(`   T+${entry.time.toFixed(1)}s: ${entry.count} images (+${entry.delta})`);
  });

  const finalCount = countImages();
  console.log(`\n✅ Total final: ${finalCount} images`);

  if (timeline.length > 0) {
    const lastImageTime = timeline[timeline.length - 1].time;
    const delayAfterCode = lastImageTime - (codeTime / 1000);
    console.log(`⏱️  Délai entre code et dernière image: ${delayAfterCode.toFixed(1)}s`);
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('🧪 TEST STRATEGY VALIDATION\n');
  console.log(`Node ID: ${TEST_NODE_ID}`);
  console.log(`Assets Dir: ${ASSETS_DIR}\n`);

  const client = await createMCPClient();

  try {
    // Exécuter les tests
    await test1_dirForAssetWritesEmpty(client);
    await test2_imagesOnFailure(client);
    await test3_imageTiming(client);

    console.log('✅ Tous les tests terminés\n');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  } finally {
    await client.close();
  }
}

main().catch(console.error);

/**
 * StickyChain Demo - Shows how to use the application
 *
 * This demonstrates all the key features:
 * - Creating boards
 * - Creating and moving cards
 * - Blockchain audit trail
 * - Event observers
 * - Design patterns in action
 */

import { Application } from '../core/Application';
import { BoardFactory } from '../factories/BoardFactory';

async function runDemo() {
  console.log('🚀 StickyChain Demo\n');
  console.log('=' .repeat(60));

  // Get application instance (Singleton pattern)
  const app = Application.getInstance();

  // ==================== Create a Board ====================
  console.log('\n📋 Creating a new board...');

  const board = await app.createBoard('BASIC_KANBAN', 'user-123', 'My Project');
  console.log(`✅ Board created: ${board.name} (${board.id})`);
  console.log(`   Columns: ${board.columns.map(c => c.name).join(' → ')}`);

  // ==================== Create Cards ====================
  console.log('\n📝 Creating cards...');

  const backlogColumn = board.columns[0]; // Backlog
  const inProgressColumn = board.columns[1]; // In Progress

  // Create a high priority card
  const card1 = await app.createCard(
    board.id,
    backlogColumn.id,
    'Implement user authentication',
    'Add JWT-based authentication to the API',
    'high',
    'user-123'
  );
  console.log(`✅ Card created: "${card1.title}" [${card1.priority}]`);

  // Create a medium priority card
  const card2 = await app.createCard(
    board.id,
    backlogColumn.id,
    'Design landing page',
    'Create mockups for the landing page',
    'medium',
    'user-123'
  );
  console.log(`✅ Card created: "${card2.title}" [${card2.priority}]`);

  // Create a low priority card
  const card3 = await app.createCard(
    board.id,
    backlogColumn.id,
    'Write documentation',
    'Document the API endpoints',
    'low',
    'user-123'
  );
  console.log(`✅ Card created: "${card3.title}" [${card3.priority}]`);

  // ==================== Move Cards ====================
  console.log('\n🔄 Moving card to In Progress...');

  const movedCard = await app.moveCard(
    card1.id,
    backlogColumn.id,
    inProgressColumn.id,
    0,
    'user-123'
  );
  console.log(`✅ Moved: "${movedCard.title}" → ${inProgressColumn.name}`);

  // ==================== Update Card ====================
  console.log('\n✏️  Updating card...');

  const updatedCard = await app.updateCard(
    card1.id,
    { description: 'Add JWT-based authentication + OAuth2 support' },
    'user-123'
  );
  console.log(`✅ Updated: "${updatedCard.title}"`);
  console.log(`   New description: ${updatedCard.description}`);

  // ==================== Assign Card ====================
  console.log('\n👤 Assigning card to user...');

  const assignedCard = await app.assignCard(card2.id, 'user-456', 'user-123');
  console.log(`✅ Assigned: "${assignedCard.title}" → user-456`);

  // ==================== View Blockchain History ====================
  console.log('\n🔗 Blockchain History for Card 1:');

  const history = app.getCardHistory(card1.id);
  history.forEach((block, index) => {
    console.log(`   Block ${block.blockNumber}: ${block.action}`);
    console.log(`     Timestamp: ${block.timestamp.toISOString()}`);
    console.log(`     Actor: ${block.actorId}`);
    console.log(`     Hash: ${block.hash.substring(0, 16)}...`);
  });

  // ==================== Validate Chain ====================
  console.log('\n🔐 Validating blockchain integrity...');

  const validation = app.validateChain();
  if (validation.valid) {
    console.log('✅ Chain is valid! All blocks verified.');
  } else {
    console.log(`❌ Chain is broken at block ${validation.brokenAtBlock}`);
    console.log(`   Error: ${validation.error}`);
  }

  // ==================== View Statistics ====================
  console.log('\n📊 Application Statistics:');

  const stats = app.getStats();
  console.log(`   Total Blocks: ${stats.blockchain.totalBlocks}`);
  console.log(`   Total Cards: ${stats.cards.totalCards}`);
  console.log(`   Total Boards: ${stats.boards.totalBoards}`);
  console.log(`   Unique Entities: ${stats.blockchain.uniqueEntities}`);
  console.log(`   Event Observers: ${stats.events.globalObservers}`);

  // ==================== Query Cards ====================
  console.log('\n🔍 Querying cards...');

  const backlogCards = await app.getColumnCards(backlogColumn.id);
  console.log(`   Cards in Backlog: ${backlogCards.length}`);
  backlogCards.forEach(card => {
    console.log(`     - "${card.title}" [${card.priority}]`);
  });

  const inProgressCards = await app.getColumnCards(inProgressColumn.id);
  console.log(`   Cards in In Progress: ${inProgressCards.length}`);
  inProgressCards.forEach(card => {
    console.log(`     - "${card.title}" [${card.priority}]`);
  });

  // ==================== Audit Log ====================
  console.log('\n📜 Audit Log (last 5 events):');

  const auditLogs = app.getAuditLogs();
  auditLogs.slice(-5).forEach(event => {
    console.log(`   [${event.timestamp.toISOString()}] ${event.type}`);
  });

  // ==================== Available Board Templates ====================
  console.log('\n📐 Available Board Templates:');

  const templates = BoardFactory.getTemplates();
  templates.forEach(({ name, template }) => {
    console.log(`   ${name}:`);
    console.log(`     ${template.description}`);
    console.log(`     Columns: ${template.columns.map(c => c.name).join(' → ')}`);
  });

  // ==================== Chain Statistics ====================
  console.log('\n⛓️  Blockchain Statistics:');

  const chainStats = app.getChainStats();
  console.log(`   Total Blocks: ${chainStats.totalBlocks}`);
  console.log(`   Latest Block: ${chainStats.latestBlockTime.toISOString()}`);
  console.log(`   Actions:`);
  Object.entries(chainStats.actionCounts).forEach(([action, count]) => {
    console.log(`     ${action}: ${count}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✨ Demo complete!\n');
}

// Run the demo
runDemo().catch(console.error);

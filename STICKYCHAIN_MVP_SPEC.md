# StickyChain MVP - Simplified Specification

## Overview
A Kanban board with a **faux-blockchain** audit trail. Think: Trello meets immutable event sourcing - all actions are chained together for transparency and history tracking.

---

## Core Concept: Faux-Blockchain

Instead of real blockchain, we use a **chain data structure** (linked list of events) where:
- Every action (create card, move card, update) = new "block" in the chain
- Each block contains: `{timestamp, action, data, previousHash, hash}`
- Hash ensures integrity (simple SHA-256 of block content + previous hash)
- Immutable audit trail - can't change history without breaking chain
- Stored in database, not distributed ledger

**Why this works:**
- Gives blockchain-like transparency and immutability
- No crypto/gas fees complexity
- Easy to upgrade to real blockchain later
- Fast and cheap to run

---

## MVP Features (Keep It Simple!)

### 1. Core Kanban Board
- **Boards**: Projects with multiple columns
- **Columns**: Default: `Backlog → In Progress → Review → Done`
- **Cards**: Tasks/stories with:
  - Title, description (markdown)
  - Priority (High/Med/Low)
  - Assignee(s)
  - Status
  - Comments thread
  - Attachments (file URLs)

### 2. Faux-Blockchain Features
- **Event Chain**: All mutations logged as chain blocks
- **History View**: See full audit trail for any card
- **Rollback**: Replay events to restore previous state
- **Verification**: Validate chain integrity on load

### 3. User Management (Simple)
- Username/password auth (no wallets!)
- User profile: name, avatar, bio
- Simple reputation: count of completed tasks

### 4. Collaboration
- Assign users to cards
- Comment threads
- @mentions for notifications
- Real-time updates (WebSocket)

### 5. Basic Workflow
- Drag-and-drop cards between columns
- Card state machine (Backlog → In Progress → Review → Done)
- Simple approval: Move to "Done" requires reviewer

---

## Technical Architecture

### Design Patterns to Use

#### 1. **Repository Pattern**
```
Interface: CardRepository, BoardRepository, UserRepository
Implementations: InMemoryRepo (testing), DatabaseRepo (production)
Benefits: Clean data access, easy to swap DBs
```

#### 2. **Observer Pattern**
```
BoardObserver → notifies subscribers on card changes
Use for: Real-time WebSocket updates, notifications
```

#### 3. **Factory Pattern**
```
CardFactory.create(type) → returns Card, Epic, or Story
BoardFactory.create(template) → returns pre-configured board
```

#### 4. **Strategy Pattern**
```
PriorityStrategy → different algorithms for sorting (FIFO, Priority, etc)
NotificationStrategy → email, SMS, push, websocket
```

#### 5. **Chain of Responsibility**
```
ApprovalChain → card moves through validators (PM → QA → Client)
```

#### 6. **Command Pattern**
```
Every action is a Command object (MoveCardCommand, UpdateCardCommand)
Benefits: Undo/redo, audit trail, easy to serialize to blockchain
```

#### 7. **Event Sourcing**
```
Don't store current state - store all events
Rebuild state by replaying event chain
Perfect for our faux-blockchain!
```

---

## Data Structures & Algorithms

### 1. Event Chain (Faux-Blockchain)
```typescript
class Block {
  timestamp: Date
  action: Command
  data: any
  previousHash: string
  hash: string // SHA-256(timestamp + action + data + previousHash)
}

class Chain {
  blocks: Block[] // Linked list via previousHash

  addBlock(command: Command): Block
  validateChain(): boolean
  getHistory(cardId: string): Block[]
  replayTo(timestamp: Date): BoardState
}
```

**Algorithm: Chain Validation**
```
For each block from genesis to head:
  - Calculate hash from block content
  - Verify hash matches stored hash
  - Verify previousHash matches previous block
  - O(n) complexity, run on startup or API call
```

### 2. Card Hierarchy (Tree)
```typescript
class Card {
  id: string
  parent: Card | null
  children: Card[]
  // Composite pattern for Epic → Story → Task
}

// Algorithm: Get all descendants (DFS)
getDescendants(): Card[] {
  let result = []
  for (child of this.children) {
    result.push(child, ...child.getDescendants())
  }
  return result
}
```

### 3. Priority Queue for Task Scheduling
```typescript
class TaskQueue {
  heap: MinHeap<Card> // Sorted by priority + deadline

  enqueue(card: Card): void // O(log n)
  dequeue(): Card // O(log n)
  peek(): Card // O(1)
}
```

### 4. HashMap for Fast Lookups
```typescript
class BoardIndex {
  cards: Map<string, Card> // cardId → Card
  userCards: Map<string, Set<string>> // userId → Set<cardId>
  columnCards: Map<string, string[]> // columnId → [cardIds] (ordered)

  // O(1) lookups for common queries
  getCard(id: string): Card
  getUserCards(userId: string): Card[]
  getColumnCards(columnId: string): Card[]
}
```

### 5. Merkle Tree for Batch Verification (Future)
```typescript
// For when you go to real blockchain
class MerkleTree {
  root: string // Hash of all cards in a batch

  // Verify single card without downloading all data
  verify(card: Card, proof: string[]): boolean
}
```

---

## Tech Stack

### Backend
- **Language**: TypeScript/Node.js
- **Framework**: Express or Fastify
- **Database**: PostgreSQL (events table + materialized views for current state)
- **ORM**: Prisma or TypeORM
- **WebSocket**: Socket.io for real-time
- **Auth**: JWT tokens

### Frontend
- **Framework**: React or Vue
- **UI Library**: Tailwind CSS
- **Drag-and-Drop**: react-beautiful-dnd or dnd-kit
- **State Management**: Zustand or Redux Toolkit
- **Real-time**: Socket.io-client

### DevOps
- **Container**: Docker
- **CI/CD**: GitHub Actions
- **Hosting**: Vercel (frontend) + Railway (backend)

---

## Database Schema

### Tables

#### 1. `events` (The Blockchain!)
```sql
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  block_number INT UNIQUE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  action_type VARCHAR(50), -- 'CREATE_CARD', 'MOVE_CARD', etc
  entity_type VARCHAR(50), -- 'Card', 'Board', 'User'
  entity_id VARCHAR(255),
  data JSONB, -- Full action payload
  actor_id VARCHAR(255), -- Who did it
  previous_hash VARCHAR(64),
  hash VARCHAR(64) -- SHA-256
);

CREATE INDEX idx_events_entity ON events(entity_type, entity_id);
CREATE INDEX idx_events_actor ON events(actor_id);
```

#### 2. `cards` (Materialized View)
```sql
CREATE TABLE cards (
  id VARCHAR(255) PRIMARY KEY,
  board_id VARCHAR(255),
  column_id VARCHAR(255),
  title VARCHAR(500),
  description TEXT,
  priority VARCHAR(20),
  assignee_id VARCHAR(255),
  parent_id VARCHAR(255), -- For hierarchy
  position INT, -- Order in column
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### 3. `boards`, `columns`, `users`, `comments` (standard tables)

---

## API Design

### REST Endpoints

```
POST   /api/boards                    Create board
GET    /api/boards/:id                Get board with cards
POST   /api/boards/:id/cards          Create card
PATCH  /api/cards/:id                 Update card
POST   /api/cards/:id/move            Move card to column
GET    /api/cards/:id/history         Get event chain for card
POST   /api/cards/:id/comments        Add comment

GET    /api/chain/validate            Validate entire chain integrity
GET    /api/chain/stats               Chain statistics
```

### WebSocket Events

```
board:join → { boardId }
board:update → { boardId, cards }
card:moved → { cardId, fromColumn, toColumn }
comment:added → { cardId, comment }
```

---

## Key Algorithms

### 1. Card Move Algorithm
```typescript
async moveCard(cardId: string, toColumnId: string, position: number) {
  // 1. Validate move is allowed (state machine check)
  // 2. Create MoveCardCommand
  // 3. Add command to event chain (new block)
  // 4. Update materialized view (cards table)
  // 5. Broadcast to WebSocket subscribers
  // 6. Return new state
}
```

### 2. State Reconstruction (Event Replay)
```typescript
async reconstructState(boardId: string, atTimestamp?: Date): BoardState {
  // 1. Get all events for board from chain
  // 2. Filter events up to timestamp (if specified)
  // 3. Reduce events into current state:
  //    state = events.reduce((state, event) => applyEvent(state, event), initialState)
  // 4. Return reconstructed state
}
```

### 3. Chain Validation
```typescript
async validateChain(): ValidationResult {
  const events = await getEventsOrdered()
  let prevHash = '0' // Genesis

  for (const event of events) {
    const calculatedHash = sha256(
      event.timestamp + event.action + event.data + prevHash
    )

    if (calculatedHash !== event.hash) {
      return { valid: false, brokenAtBlock: event.block_number }
    }

    if (event.previous_hash !== prevHash) {
      return { valid: false, brokenAtBlock: event.block_number }
    }

    prevHash = event.hash
  }

  return { valid: true }
}
```

---

## Development Phases

### Phase 1: Core MVP (2-3 weeks)
- [ ] Basic board with columns
- [ ] Card CRUD operations
- [ ] Drag-and-drop
- [ ] Event chain implementation
- [ ] Simple auth

### Phase 2: Collaboration (1-2 weeks)
- [ ] Comments
- [ ] Assignments
- [ ] Real-time updates
- [ ] Notifications

### Phase 3: Advanced (2-3 weeks)
- [ ] Card hierarchy (epics)
- [ ] History/audit view
- [ ] Chain validation UI
- [ ] State rollback
- [ ] Search/filters

### Phase 4: Polish (1 week)
- [ ] Sticky note UI design
- [ ] Mobile responsive
- [ ] Performance optimization
- [ ] Testing

---

## Future: Upgrading to Real Blockchain

When ready, the architecture makes it easy:

1. **Event Chain → Smart Contracts**
   - `events` table → Ethereum contract events
   - Hash verification → Merkle proof verification

2. **Commands → Transactions**
   - Each command becomes a signed transaction
   - Gas fees replace API rate limits

3. **Users → Wallets**
   - JWT auth → MetaMask signatures
   - User IDs → Ethereum addresses

4. **Reputation → Tokens/NFTs**
   - Points → ERC-20 tokens
   - Badges → ERC-721 NFTs

---

## Example: Card Lifecycle in Code

```typescript
// 1. User creates card
const createCmd = new CreateCardCommand({
  title: "Build login page",
  boardId: "board-123",
  columnId: "backlog"
})

// 2. Add to chain
const block = await chain.addBlock(createCmd)
// Block: {
//   action: "CREATE_CARD",
//   data: { title: "Build login page", ... },
//   hash: "a3f5b...",
//   previousHash: "9c2e1..."
// }

// 3. Update materialized view
await cardRepo.create(createCmd.data)

// 4. Broadcast to subscribers
boardObserver.notify("card:created", createCmd.data)

// 5. User moves card
const moveCmd = new MoveCardCommand({
  cardId: card.id,
  toColumnId: "in-progress"
})

await chain.addBlock(moveCmd)
await cardRepo.update(card.id, { columnId: "in-progress" })
boardObserver.notify("card:moved", moveCmd.data)

// 6. View history
const history = await chain.getHistory(card.id)
// Returns: [CreateCardBlock, MoveCardBlock, UpdateCardBlock, ...]
```

---

## Summary

**What you get:**
✅ Full Kanban board functionality
✅ Blockchain-like immutability and audit trail
✅ Event sourcing architecture
✅ Solid design patterns (Repository, Observer, Command, Factory, Strategy)
✅ Efficient data structures (Chain, Tree, HashMap, PriorityQueue)
✅ Easy path to real blockchain later
✅ No crypto complexity NOW

**What you skip (for now):**
❌ Real blockchain/Ethereum
❌ Crypto payments/wallets
❌ Smart contracts
❌ Token economy
❌ Decentralization

**Tech Debt:**
- When ready for blockchain, refactor Chain → SmartContract
- Event storage: DB → IPFS + contract events
- Auth: JWT → wallet signatures

This gives you a **production-ready MVP** that you can build in 6-8 weeks, with a clear upgrade path to blockchain when the time is right.

Ready to start building? 🚀

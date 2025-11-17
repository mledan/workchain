# StickyChain - Kanban Board with Faux-Blockchain

A modern Kanban board application with blockchain-inspired audit trail, built with TypeScript and design patterns.

## 🎯 Overview

StickyChain combines the simplicity of a Kanban board with the transparency and immutability of blockchain technology (without the complexity of real crypto). Every action is recorded in an immutable event chain, providing a complete audit trail.

### Key Features

✅ **Kanban Board**: Drag-and-drop cards across columns
✅ **Faux-Blockchain**: Immutable audit trail using chain data structure
✅ **Event Sourcing**: Rebuild state from event history
✅ **Design Patterns**: Repository, Command, Observer, Factory, Singleton
✅ **Real-time Updates**: Observer pattern for notifications
✅ **Hierarchical Cards**: Epics → Stories → Tasks
✅ **Type-Safe**: Full TypeScript implementation

## 🏗️ Architecture

### Design Patterns Used

#### 1. **Repository Pattern**
Separates data access from business logic. Easy to swap implementations.

```typescript
// Interface-based design
interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  create(entity: T): Promise<T>;
  // ... more methods
}

// In-memory implementation for MVP
class CardRepository implements IRepository<Card> { }

// Later: Database implementation
class DatabaseCardRepository implements IRepository<Card> { }
```

#### 2. **Command Pattern**
Encapsulates actions as objects, perfect for undo/redo and blockchain logging.

```typescript
// Every action is a command
const createCmd = new CreateCardCommand(chain, repo, {
  title: "Build feature",
  boardId: "board-123",
  // ...
});

await createCmd.execute();
// Automatically logged to blockchain!
```

#### 3. **Observer Pattern**
Real-time notifications and event broadcasting.

```typescript
// Subscribe to events
eventEmitter.attach(new WebSocketObserver(io), 'card:moved');
eventEmitter.attach(new ConsoleLoggerObserver());

// Emit events
eventEmitter.emit('card:created', cardData);
```

#### 4. **Factory Pattern**
Creates boards with predefined templates.

```typescript
// Create from template
const board = BoardFactory.createFromTemplate('BASIC_KANBAN', userId);

// Available templates: BASIC_KANBAN, SDLC, BUG_TRACKER, FEATURE_DEV
```

#### 5. **Singleton Pattern**
One application instance manages all state.

```typescript
const app = Application.getInstance();
```

#### 6. **Event Sourcing**
State is derived from events, not stored directly.

```typescript
// Replay events to reconstruct state at any point in time
const events = chain.replayEvents(cardId, timestamp);
```

---

## 📊 Data Structures & Algorithms

### 1. **Chain (Linked List)**
Our faux-blockchain implementation.

```
Block 0 → Block 1 → Block 2 → Block 3
   ↓         ↓         ↓         ↓
hash(0)   hash(1)   hash(2)   hash(3)
   ↑         ↑         ↑
   └─────────┴─────────┘
     previousHash
```

**Properties:**
- Each block contains: `{action, data, timestamp, previousHash, hash}`
- Hash = SHA-256(blockData + previousHash)
- Immutable: Changing any block breaks the chain

**Algorithms:**
- Add block: O(1)
- Validate chain: O(n)
- Get history: O(1) with index

### 2. **HashMap Indexing**
Fast O(1) lookups for cards, boards, users.

```typescript
private cards: Map<string, Card> = new Map();
private boardIndex: Map<string, Set<string>> = new Map(); // boardId → cardIds
private columnIndex: Map<string, string[]> = new Map(); // columnId → [cardIds]
```

### 3. **Tree Structure (Hierarchical Cards)**
Epic → Stories → Tasks using Composite pattern.

```
Epic: "User Management"
├── Story: "User Registration"
│   ├── Task: "Design form"
│   └── Task: "API endpoint"
└── Story: "User Login"
    └── Task: "JWT implementation"
```

**Algorithm: Get All Descendants (DFS)**
```typescript
async findAllDescendants(parentId: string): Promise<Card[]> {
  const descendants = [];
  const stack = [parentId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    const children = await findChildren(currentId);

    for (const child of children) {
      descendants.push(child);
      stack.push(child.id);
    }
  }

  return descendants;
}
```

### 4. **Priority Queue** (Future: Task Scheduling)
Min-heap for prioritizing tasks.

---

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Run Demo

```bash
npm run dev -- src/examples/demo.ts
```

### Run Tests (Coming Soon)

```bash
npm test
```

---

## 📖 Usage Examples

### Create a Board

```typescript
import { Application } from './core/Application';

const app = Application.getInstance();

// Create from template
const board = await app.createBoard('BASIC_KANBAN', 'user-123', 'My Project');

// Create custom board
const customBoard = BoardFactory.createCustom(
  'My Board',
  'Custom columns',
  'user-123',
  ['To Do', 'Doing', 'Done']
);
```

### Create Cards

```typescript
// Create a card
const card = await app.createCard(
  boardId,
  columnId,
  'Implement authentication',
  'Add JWT-based auth',
  'high', // priority
  'user-123' // actor
);

// Create hierarchical cards (Epic → Story → Task)
const epic = await app.createCard(
  boardId,
  columnId,
  'User Management Epic',
  'All user-related features',
  'high',
  'user-123'
);

const story = await app.createCard(
  boardId,
  columnId,
  'User Registration',
  'Implement registration flow',
  'high',
  'user-123',
  epic.id // parentId
);
```

### Move Cards

```typescript
await app.moveCard(
  cardId,
  fromColumnId,
  toColumnId,
  position,
  'user-123'
);
```

### View Blockchain History

```typescript
// Get all events for a card
const history = app.getCardHistory(cardId);

history.forEach(block => {
  console.log(`${block.action} at ${block.timestamp}`);
  console.log(`Data:`, block.data);
  console.log(`Hash: ${block.hash}`);
});

// Validate chain integrity
const validation = app.validateChain();
if (validation.valid) {
  console.log('✅ Chain is valid!');
}
```

### Subscribe to Events

```typescript
import { IObserver, Event } from './observers/EventObserver';

class MyObserver implements IObserver {
  update(event: Event) {
    console.log(`Event: ${event.type}`, event.data);
  }
}

const observer = new MyObserver();
app.getEventEmitter().attach(observer, 'card:moved');
```

---

## 🔐 Blockchain Features

### How It Works

1. **Block Creation**: Every action creates a new block
2. **Hashing**: Each block is hashed using SHA-256
3. **Linking**: New block references previous block's hash
4. **Validation**: Can verify entire chain integrity

### Example Chain

```json
[
  {
    "blockNumber": 0,
    "action": "CREATE_BOARD",
    "entityId": "genesis",
    "hash": "a3f5b9c2...",
    "previousHash": "0"
  },
  {
    "blockNumber": 1,
    "action": "CREATE_CARD",
    "entityId": "card-123",
    "hash": "7d2e8f1a...",
    "previousHash": "a3f5b9c2..."
  },
  {
    "blockNumber": 2,
    "action": "MOVE_CARD",
    "entityId": "card-123",
    "hash": "4c9a3b7e...",
    "previousHash": "7d2e8f1a..."
  }
]
```

### Benefits

- ✅ **Immutability**: Can't change history without detection
- ✅ **Audit Trail**: Complete record of all actions
- ✅ **Transparency**: Anyone can verify the chain
- ✅ **Event Sourcing**: Rebuild state from events
- ✅ **Easy Upgrade Path**: Can migrate to real blockchain later

---

## 📁 Project Structure

```
workchain/
├── src/
│   ├── blockchain/          # Faux-blockchain implementation
│   │   ├── Block.ts        # Block class with hashing
│   │   └── Chain.ts        # Chain management
│   ├── commands/            # Command pattern
│   │   ├── Command.ts      # Base command interface
│   │   └── CardCommands.ts # Card-specific commands
│   ├── core/                # Core application
│   │   └── Application.ts  # Main facade
│   ├── factories/           # Factory pattern
│   │   └── BoardFactory.ts # Board templates
│   ├── observers/           # Observer pattern
│   │   └── EventObserver.ts # Event system
│   ├── repositories/        # Repository pattern
│   │   ├── IRepository.ts  # Repository interface
│   │   ├── CardRepository.ts
│   │   └── BoardRepository.ts
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   └── examples/
│       └── demo.ts         # Usage examples
├── STICKYCHAIN_MVP_SPEC.md # Full specification
├── package.json
└── tsconfig.json
```

---

## 🔄 Workflow Example

```
1. User creates board
   └─> BoardFactory creates Board with columns
       └─> Saved to BoardRepository
           └─> Logged to Chain as CREATE_BOARD block
               └─> EventEmitter notifies observers

2. User creates card
   └─> CreateCardCommand created
       └─> Command.execute()
           ├─> CardRepository.create()
           ├─> Chain.addBlock()
           └─> EventEmitter.emit('card:created')

3. User moves card
   └─> MoveCardCommand created
       └─> Command.execute()
           ├─> CardRepository.move()
           ├─> Chain.addBlock()
           └─> EventEmitter.emit('card:moved')
               └─> WebSocketObserver broadcasts to clients
```

---

## 📊 Statistics

```typescript
const stats = app.getStats();

// Returns:
{
  blockchain: {
    totalBlocks: 15,
    uniqueEntities: 8,
    actionCounts: { CREATE_CARD: 5, MOVE_CARD: 3, ... }
  },
  cards: {
    totalCards: 8,
    boards: 2,
    columns: 8
  },
  boards: {
    totalBoards: 2,
    totalOwners: 1
  },
  events: {
    globalObservers: 2,
    typeSpecificObservers: { 'card:moved': 1 }
  }
}
```

---

## 🎨 Board Templates

### 1. **Basic Kanban**
```
Backlog → In Progress → Review → Done
```

### 2. **SDLC (Software Development Lifecycle)**
```
Ideation → Refinement → Development → Testing → Review → Deployment → Done
```

### 3. **Bug Tracker**
```
Reported → Confirmed → In Progress → Fixed → Verified → Closed
```

### 4. **Feature Development**
```
Ideas → Spec → Design → Implementation → QA → Released
```

---

## 🔮 Future Enhancements

### Phase 2: Collaboration
- [ ] User authentication
- [ ] Comments on cards
- [ ] @mentions and notifications
- [ ] WebSocket real-time updates

### Phase 3: Advanced Features
- [ ] Card attachments
- [ ] Due dates and reminders
- [ ] Card labels/tags
- [ ] Search and filters
- [ ] Analytics dashboard

### Phase 4: Blockchain Upgrade
- [ ] Migrate to real blockchain (Ethereum/Polygon)
- [ ] Smart contracts
- [ ] Crypto payments
- [ ] NFT badges

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- Block.test.ts
```

---

## 📚 Learn More

### Design Patterns Resources
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Command Pattern](https://refactoring.guru/design-patterns/command)
- [Observer Pattern](https://refactoring.guru/design-patterns/observer)
- [Factory Pattern](https://refactoring.guru/design-patterns/factory-method)
- [Event Sourcing](https://martinfowler.com/articles/201701-event-driven.html)

### Blockchain Concepts
- [How Blockchain Works (Simple)](https://andersbrownworth.com/blockchain/)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)

---

## 🤝 Contributing

This is a learning project focused on design patterns and algorithms. Feel free to:
- Add new design patterns
- Improve algorithms
- Add tests
- Suggest features

---

## 📄 License

MIT

---

## 💡 Key Takeaways

This project demonstrates:

1. ✅ **Faux-blockchain** using linked list + hashing (no crypto needed!)
2. ✅ **Event Sourcing** - state from events
3. ✅ **Design Patterns** - Repository, Command, Observer, Factory, Singleton
4. ✅ **Data Structures** - HashMap, Linked List, Tree
5. ✅ **Algorithms** - DFS, hashing, chain validation
6. ✅ **TypeScript** - Full type safety
7. ✅ **SOLID Principles** - Clean, maintainable code

**Perfect for:**
- Learning design patterns
- Understanding blockchain concepts without crypto
- Building event-sourced systems
- Creating audit trails
- Kanban/project management

---

Built with ❤️ using TypeScript, Design Patterns, and Algorithms

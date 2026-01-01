# Phase 2 - Task 5: Implement CQRS Pattern

**Duration:** 5-6 days  
**Priority:** High  
**Dependencies:** Tasks 2, 3, 4 (Domain Layers Implemented)

---

## Objective

Implement Command Query Responsibility Segregation (CQRS) pattern to separate read and write operations, enabling independent scaling and optimization of each side.

---

## Context

CQRS separates:
- **Commands:** Operations that change state (writes)
- **Queries:** Operations that read state (reads)

Benefits:
- Optimize reads and writes independently
- Scale read and write databases separately
- Simplify complex domain models
- Better performance for read-heavy workloads

---

## Architecture

```
┌──────────────────────────────────────────────┐
│              API Layer                       │
└────────┬─────────────────────┬───────────────┘
         │                     │
    ┌────▼─────┐         ┌────▼─────┐
    │ Commands │         │ Queries  │
    └────┬─────┘         └────┬─────┘
         │                     │
    ┌────▼──────────┐    ┌────▼──────────┐
    │   Command     │    │    Query      │
    │   Handlers    │    │   Handlers    │
    └────┬──────────┘    └────┬──────────┘
         │                     │
    ┌────▼──────────┐    ┌────▼──────────┐
    │  Write Model  │    │  Read Model   │
    │  (Normalized) │    │(Denormalized) │
    └────┬──────────┘    └────┬──────────┘
         │                     │
    ┌────▼──────────┐    ┌────▼──────────┐
    │  Write DB     │    │   Read DB     │
    │  (MongoDB)    │    │  (MongoDB)    │
    └───────────────┘    └───────────────┘
         │
         └──────► Domain Events ──────┐
                                      │
                            ┌─────────▼──────────┐
                            │  Event Handlers    │
                            │  (Update Read DB)  │
                            └────────────────────┘
```

---

## Implementation Steps

### Step 1: Create Command Infrastructure

**Create `src/application/commands/command.interface.ts`:**

```typescript
export interface Command {
  readonly commandName: string;
  readonly timestamp: Date;
  readonly userId?: string;
}

export abstract class BaseCommand implements Command {
  public readonly commandName: string;
  public readonly timestamp: Date;
  public readonly userId?: string;

  constructor(commandName: string, userId?: string) {
    this.commandName = commandName;
    this.timestamp = new Date();
    this.userId = userId;
  }
}
```

**Create `src/application/commands/command-handler.interface.ts`:**

```typescript
import { Command } from './command.interface';
import { AsyncResult } from '@shared/types/result';

export interface CommandHandler<TCommand extends Command, TResult = void> {
  handle(command: TCommand): AsyncResult<TResult>;
}
```

**Create `src/application/commands/command-bus.ts`:**

```typescript
import { Command } from './command.interface';
import { CommandHandler } from './command-handler.interface';
import { AsyncResult, failure } from '@shared/types/result';
import { DomainError } from '@shared/errors';

export class CommandBus {
  private handlers = new Map<string, CommandHandler<any, any>>();

  register<TCommand extends Command, TResult>(
    commandName: string,
    handler: CommandHandler<TCommand, TResult>
  ): void {
    if (this.handlers.has(commandName)) {
      throw new Error(`Handler for command ${commandName} already registered`);
    }
    this.handlers.set(commandName, handler);
  }

  async execute<TCommand extends Command, TResult>(
    command: TCommand
  ): AsyncResult<TResult> {
    const handler = this.handlers.get(command.commandName);

    if (!handler) {
      return failure(
        new DomainError(
          `No handler registered for command: ${command.commandName}`,
          'NO_HANDLER',
          500
        )
      );
    }

    return handler.handle(command);
  }
}
```

### Step 2: Create Query Infrastructure

**Create `src/application/queries/query.interface.ts`:**

```typescript
export interface Query {
  readonly queryName: string;
  readonly timestamp: Date;
  readonly userId?: string;
}

export abstract class BaseQuery implements Query {
  public readonly queryName: string;
  public readonly timestamp: Date;
  public readonly userId?: string;

  constructor(queryName: string, userId?: string) {
    this.queryName = queryName;
    this.timestamp = new Date();
    this.userId = userId;
  }
}
```

**Create `src/application/queries/query-handler.interface.ts`:**

```typescript
import { Query } from './query.interface';
import { AsyncResult } from '@shared/types/result';

export interface QueryHandler<TQuery extends Query, TResult> {
  handle(query: TQuery): AsyncResult<TResult>;
}
```

**Create `src/application/queries/query-bus.ts`:**

```typescript
import { Query } from './query.interface';
import { QueryHandler } from './query-handler.interface';
import { AsyncResult, failure } from '@shared/types/result';
import { DomainError } from '@shared/errors';

export class QueryBus {
  private handlers = new Map<string, QueryHandler<any, any>>();

  register<TQuery extends Query, TResult>(
    queryName: string,
    handler: QueryHandler<TQuery, TResult>
  ): void {
    if (this.handlers.has(queryName)) {
      throw new Error(`Handler for query ${queryName} already registered`);
    }
    this.handlers.set(queryName, handler);
  }

  async execute<TQuery extends Query, TResult>(query: TQuery): AsyncResult<TResult> {
    const handler = this.handlers.get(query.queryName);

    if (!handler) {
      return failure(
        new DomainError(
          `No handler registered for query: ${query.queryName}`,
          'NO_HANDLER',
          500
        )
      );
    }

    return handler.handle(query);
  }
}
```

### Step 3: Implement Commands

**Create `src/application/commands/user/register-user.command.ts`:**

```typescript
import { BaseCommand } from '../command.interface';
import { UserRole } from '@shared/types/common';

export class RegisterUserCommand extends BaseCommand {
  constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly password: string,
    public readonly role: UserRole = UserRole.USER
  ) {
    super('RegisterUserCommand');
  }
}
```

**Create `src/application/commands/user/register-user.handler.ts`:**

```typescript
import { CommandHandler } from '../command-handler.interface';
import { RegisterUserCommand } from './register-user.command';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { User } from '@domain/user/aggregates/user.aggregate';
import { Email } from '@domain/user/value-objects/email.vo';
import { Password } from '@domain/user/value-objects/password.vo';
import { UserDomainService } from '@domain/user/services/user-domain.service';
import { AsyncResult, success, failure } from '@shared/types/result';
import { ID } from '@shared/types/common';
import { EventBus } from '@infrastructure/events/event-bus';

export interface RegisterUserResult {
  userId: ID;
  email: string;
  name: string;
}

export class RegisterUserHandler implements CommandHandler<RegisterUserCommand, RegisterUserResult> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly userDomainService: UserDomainService,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: RegisterUserCommand): AsyncResult<RegisterUserResult> {
    // Create value objects
    const email = Email.create(command.email);
    const password = await Password.create(command.password);

    // Check business rules
    await this.userDomainService.ensureEmailIsUnique(email);

    // Create aggregate
    const userId = this.generateId();
    const user = User.create(
      {
        name: command.name,
        email,
        password,
        role: command.role,
      },
      userId
    );

    // Validate
    user.validate();

    // Persist
    const saveResult = await this.userRepository.save(user);
    if (!saveResult.success) {
      return failure(saveResult.error);
    }

    // Publish domain events
    await this.publishEvents(user);

    return success({
      userId: user.id,
      email: user.email.value,
      name: user.name,
    });
  }

  private async publishEvents(user: User): Promise<void> {
    for (const event of user.domainEvents) {
      await this.eventBus.publish(event);
    }
    user.clearDomainEvents();
  }

  private generateId(): ID {
    return new Date().getTime().toString();
  }
}
```

**Create `src/application/commands/order/place-order.command.ts`:**

```typescript
import { BaseCommand } from '../command.interface';
import { ID } from '@shared/types/common';

export interface OrderItemData {
  productId: ID;
  quantity: number;
  price: number;
}

export class PlaceOrderCommand extends BaseCommand {
  constructor(
    userId: ID,
    public readonly items: OrderItemData[],
    public readonly shippingAddressId: ID,
    public readonly paymentMethodId: ID
  ) {
    super('PlaceOrderCommand', userId);
  }
}
```

### Step 4: Implement Queries

**Create `src/application/queries/user/get-user-profile.query.ts`:**

```typescript
import { BaseQuery } from '../query.interface';
import { ID } from '@shared/types/common';

export class GetUserProfileQuery extends BaseQuery {
  constructor(
    public readonly userId: ID,
    requestingUserId?: ID
  ) {
    super('GetUserProfileQuery', requestingUserId);
  }
}
```

**Create `src/application/queries/user/get-user-profile.handler.ts`:**

```typescript
import { QueryHandler } from '../query-handler.interface';
import { GetUserProfileQuery } from './get-user-profile.query';
import { IUserReadRepository } from '@infrastructure/database/mongodb/read-models/user-read.repository';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';

export interface UserProfileDTO {
  id: string;
  name: string;
  email: string;
  role: string;
  currentOrderCount: number;
  memberSince: string;
  lastLogin?: string;
}

export class GetUserProfileHandler implements QueryHandler<GetUserProfileQuery, UserProfileDTO> {
  constructor(private readonly userReadRepository: IUserReadRepository) {}

  async handle(query: GetUserProfileQuery): AsyncResult<UserProfileDTO> {
    const user = await this.userReadRepository.findById(query.userId);

    if (!user) {
      return failure(new NotFoundError('User', query.userId));
    }

    return success({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      currentOrderCount: user.currentOrderCount,
      memberSince: user.createdAt.toISOString(),
      lastLogin: user.lastLogin?.toISOString(),
    });
  }
}
```

**Create `src/application/queries/order/get-order-history.query.ts`:**

```typescript
import { BaseQuery } from '../query.interface';
import { ID, PaginationParams } from '@shared/types/common';

export class GetOrderHistoryQuery extends BaseQuery {
  constructor(
    userId: ID,
    public readonly pagination: PaginationParams
  ) {
    super('GetOrderHistoryQuery', userId);
  }
}
```

### Step 5: Create Read Models

**Create `src/infrastructure/database/mongodb/read-models/user-read.model.ts`:**

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IUserReadModel extends Document {
  id: string;
  name: string;
  email: string;
  role: string;
  currentOrderCount: number;
  returnedOrderCount: number;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userReadSchema = new Schema<IUserReadModel>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, required: true },
    currentOrderCount: { type: Number, default: 0 },
    returnedOrderCount: { type: Number, default: 0 },
    lastLogin: { type: Date },
  },
  {
    timestamps: true,
    collection: 'users_read',
  }
);

// Indexes for fast queries
userReadSchema.index({ email: 1 });
userReadSchema.index({ role: 1 });
userReadSchema.index({ createdAt: -1 });

export const UserReadModel = mongoose.model<IUserReadModel>('UserRead', userReadSchema);
```

**Create `src/infrastructure/database/mongodb/read-models/user-read.repository.ts`:**

```typescript
import { UserReadModel, IUserReadModel } from './user-read.model';
import { ID } from '@shared/types/common';

export interface IUserReadRepository {
  findById(id: ID): Promise<IUserReadModel | null>;
  findByEmail(email: string): Promise<IUserReadModel | null>;
  search(query: string, limit: number): Promise<IUserReadModel[]>;
}

export class UserReadRepository implements IUserReadRepository {
  async findById(id: ID): Promise<IUserReadModel | null> {
    return UserReadModel.findOne({ id }).exec();
  }

  async findByEmail(email: string): Promise<IUserReadModel | null> {
    return UserReadModel.findOne({ email }).exec();
  }

  async search(query: string, limit: number = 10): Promise<IUserReadModel[]> {
    return UserReadModel.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    })
      .limit(limit)
      .exec();
  }
}
```

### Step 6: Event Handlers to Update Read Models

**Create `src/infrastructure/events/handlers/user-registered.handler.ts`:**

```typescript
import { EventHandler } from '../event-handler.interface';
import { UserRegistered } from '@domain/user/events/user-registered.event';
import { UserReadModel } from '@infrastructure/database/mongodb/read-models/user-read.model';

export class UserRegisteredHandler implements EventHandler<UserRegistered> {
  async handle(event: UserRegistered): Promise<void> {
    const { userId, email, name, role, registeredAt } = event.payload;

    await UserReadModel.create({
      id: userId,
      email,
      name,
      role,
      currentOrderCount: 0,
      returnedOrderCount: 0,
      createdAt: registeredAt,
      updatedAt: registeredAt,
    });

    console.log(`Read model updated for UserRegistered: ${userId}`);
  }
}
```

**Create `src/infrastructure/events/handlers/user-logged-in.handler.ts`:**

```typescript
import { EventHandler } from '../event-handler.interface';
import { UserLoggedIn } from '@domain/user/events/user-logged-in.event';
import { UserReadModel } from '@infrastructure/database/mongodb/read-models/user-read.model';

export class UserLoggedInHandler implements EventHandler<UserLoggedIn> {
  async handle(event: UserLoggedIn): Promise<void> {
    const { userId, loginAt } = event.payload;

    await UserReadModel.updateOne(
      { id: userId },
      {
        $set: {
          lastLogin: loginAt,
          updatedAt: new Date(),
        },
      }
    );

    console.log(`Read model updated for UserLoggedIn: ${userId}`);
  }
}
```

### Step 7: Wire Everything Together

**Create `src/infrastructure/cqrs/cqrs-module.ts`:**

```typescript
import { CommandBus } from '@application/commands/command-bus';
import { QueryBus } from '@application/queries/query-bus';
import { EventBus } from '@infrastructure/events/event-bus';

// Command Handlers
import { RegisterUserHandler } from '@application/commands/user/register-user.handler';

// Query Handlers
import { GetUserProfileHandler } from '@application/queries/user/get-user-profile.handler';

// Event Handlers
import { UserRegisteredHandler } from '@infrastructure/events/handlers/user-registered.handler';
import { UserLoggedInHandler } from '@infrastructure/events/handlers/user-logged-in.handler';

// Repositories
import { UserRepository } from '@infrastructure/database/mongodb/repositories/user.repository';
import { UserReadRepository } from '@infrastructure/database/mongodb/read-models/user-read.repository';
import { UserDomainService } from '@domain/user/services/user-domain.service';

export class CQRSModule {
  public readonly commandBus: CommandBus;
  public readonly queryBus: QueryBus;
  public readonly eventBus: EventBus;

  constructor() {
    this.commandBus = new CommandBus();
    this.queryBus = new QueryBus();
    this.eventBus = new EventBus();

    this.registerCommandHandlers();
    this.registerQueryHandlers();
    this.registerEventHandlers();
  }

  private registerCommandHandlers(): void {
    const userRepository = new UserRepository();
    const userDomainService = new UserDomainService(userRepository);

    this.commandBus.register(
      'RegisterUserCommand',
      new RegisterUserHandler(userRepository, userDomainService, this.eventBus)
    );

    // Register other command handlers...
  }

  private registerQueryHandlers(): void {
    const userReadRepository = new UserReadRepository();

    this.queryBus.register(
      'GetUserProfileQuery',
      new GetUserProfileHandler(userReadRepository)
    );

    // Register other query handlers...
  }

  private registerEventHandlers(): void {
    this.eventBus.subscribe('UserRegistered', new UserRegisteredHandler());
    this.eventBus.subscribe('UserLoggedIn', new UserLoggedInHandler());

    // Register other event handlers...
  }
}
```

---

## Testing

**Create `tests/integration/cqrs/register-user.test.ts`:**

```typescript
import { CQRSModule } from '@infrastructure/cqrs/cqrs-module';
import { RegisterUserCommand } from '@application/commands/user/register-user.command';
import { GetUserProfileQuery } from '@application/queries/user/get-user-profile.query';
import { UserRole } from '@shared/types/common';
import { isSuccess } from '@shared/types/result';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../utils/test-helpers';

describe('CQRS - Register User Flow', () => {
  let cqrsModule: CQRSModule;

  beforeAll(async () => {
    await connectTestDatabase();
    cqrsModule = new CQRSModule();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  it('should register user via command and query via read model', async () => {
    // Execute command
    const command = new RegisterUserCommand(
      'John Doe',
      'john@example.com',
      'Password123',
      UserRole.USER
    );

    const commandResult = await cqrsModule.commandBus.execute(command);
    expect(isSuccess(commandResult)).toBe(true);

    if (!isSuccess(commandResult)) return;

    // Wait for event processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Execute query
    const query = new GetUserProfileQuery(commandResult.data.userId);
    const queryResult = await cqrsModule.queryBus.execute(query);

    expect(isSuccess(queryResult)).toBe(true);
    if (isSuccess(queryResult)) {
      expect(queryResult.data.email).toBe('john@example.com');
      expect(queryResult.data.name).toBe('John Doe');
    }
  });
});
```

---

## Deliverables

- [ ] Command infrastructure (Command, CommandHandler, CommandBus)
- [ ] Query infrastructure (Query, QueryHandler, QueryBus)
- [ ] Command implementations for all write operations
- [ ] Query implementations for all read operations
- [ ] Read models (denormalized)
- [ ] Event handlers to update read models
- [ ] CQRS module wiring
- [ ] Integration tests
- [ ] Documentation

---

## Next Steps

After completing this task:
1. Proceed to **Task 6: Implement Domain Events**
2. Optimize read models for performance
3. Consider eventual consistency implications

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 5-6 days  
**Status:** Not Started

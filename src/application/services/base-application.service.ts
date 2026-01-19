import { CommandBus } from '../commands/command-bus';
import { QueryBus } from '../queries/query-bus';
import { EventBus } from '@infrastructure/events/event-bus';

export abstract class BaseApplicationService {
    constructor(
        protected readonly commandBus: CommandBus,
        protected readonly queryBus: QueryBus,
        protected readonly eventBus: EventBus
    ) { }

    protected async executeCommand<TResult>(command: any): Promise<TResult> {
        return this.commandBus.execute(command) as Promise<TResult>;
    }

    protected async executeQuery<TResult>(query: any): Promise<TResult> {
        return this.queryBus.execute(query) as Promise<TResult>;
    }
}

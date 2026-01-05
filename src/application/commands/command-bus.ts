import { Command } from './command.interface';
import { CommandHandler } from './command-handler.interface';
import { AsyncResult, failure } from '@shared/types/result';
import { DomainError } from '@shared/errors';

class NoHandlerError extends DomainError {
  constructor(commandName: string) {
    super(`No handler registered for command: ${commandName}`, 'NO_HANDLER', 500);
  }
}

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
      return failure(new NoHandlerError(command.commandName));
    }

    return handler.handle(command);
  }
}

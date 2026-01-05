import { Command } from './command.interface';
import { AsyncResult } from '@shared/types/result';

export interface CommandHandler<TCommand extends Command, TResult = void> {
  handle(command: TCommand): AsyncResult<TResult>;
}

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

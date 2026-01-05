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

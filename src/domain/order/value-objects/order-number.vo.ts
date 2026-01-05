import { ValueObject } from '@shared/domain/value-object';

interface OrderNumberProps {
  value: string;
}

export class OrderNumber extends ValueObject<OrderNumberProps> {
  private constructor(props: OrderNumberProps) {
    super(props);
  }

  static generate(timestamp: Date, userId: string): OrderNumber {
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getDate()).padStart(2, '0');
    const userHash = userId.substring(0, 4).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const value = `ORD-${year}${month}${day}-${userHash}-${random}`;
    return new OrderNumber({ value });
  }

  static fromString(value: string): OrderNumber {
    return new OrderNumber({ value });
  }

  get value(): string {
    return this._value.value;
  }

  toString(): string {
    return this.value;
  }
}

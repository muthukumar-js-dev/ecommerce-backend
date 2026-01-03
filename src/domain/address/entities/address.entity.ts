import { Entity } from '@shared/domain/entity';
import { ID, Timestamp } from '@shared/types/common';

export interface AddressProps {
  userId: ID;
  name: string;
  firstLine: string;
  secondLine?: string;
  city: string;
  state: string;
  country: string;
  countryCode?: string;
  postalCode: string;
  phone: string;
  phoneCode: string;
  isDefault: boolean;
  status: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class Address extends Entity<AddressProps> {
  private constructor(props: AddressProps, id: ID) {
    super(props, id);
  }

  static create(props: Omit<AddressProps, 'createdAt' | 'updatedAt'>, id: ID): Address {
    const now = new Date();
    return new Address(
      {
        ...props,
        isDefault: props.isDefault ?? false,
        status: props.status ?? 1,
        createdAt: now,
        updatedAt: now,
      },
      id
    );
  }

  get userId(): ID {
    return this.props.userId;
  }

  get name(): string {
    return this.props.name;
  }

  get firstLine(): string {
    return this.props.firstLine;
  }

  get secondLine(): string | undefined {
    return this.props.secondLine;
  }

  get city(): string {
    return this.props.city;
  }

  get state(): string {
    return this.props.state;
  }

  get country(): string {
    return this.props.country;
  }

  get countryCode(): string | undefined {
    return this.props.countryCode;
  }

  get postalCode(): string {
    return this.props.postalCode;
  }

  get phone(): string {
    return this.props.phone;
  }

  get phoneCode(): string {
    return this.props.phoneCode;
  }

  get isDefault(): boolean {
    return this.props.isDefault;
  }

  get status(): number {
    return this.props.status;
  }

  get isActive(): boolean {
    return this.props.status === 1;
  }

  get fullAddress(): string {
    const parts = [
      this.props.firstLine,
      this.props.secondLine,
      this.props.city,
      this.props.state,
      this.props.postalCode,
      this.props.country,
    ].filter((part) => part !== undefined && part !== '');
    return parts.join(', ');
  }

  setAsDefault(): void {
    (this.props as { isDefault: boolean }).isDefault = true;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  unsetDefault(): void {
    (this.props as { isDefault: boolean }).isDefault = false;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  deactivate(): void {
    (this.props as { status: number }).status = 0;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  activate(): void {
    (this.props as { status: number }).status = 1;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }
}

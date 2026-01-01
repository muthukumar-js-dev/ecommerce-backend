/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make all properties required recursively
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Extract properties of a certain type
 */
export type PropertiesOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Omit properties by type
 */
export type OmitByType<T, U> = Omit<T, PropertiesOfType<T, U>>;

/**
 * Pick properties by type
 */
export type PickByType<T, U> = Pick<T, PropertiesOfType<T, U>>;

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Nullable type
 */
export type Nullable<T> = T | null;

/**
 * Maybe type (nullable or undefined)
 */
export type Maybe<T> = T | null | undefined;

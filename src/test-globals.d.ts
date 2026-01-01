export {};

declare global {
  /* eslint-disable no-var */
  var describe: (name: string, fn: () => void) => void;
  var it: (name: string, fn: () => void) => void;
  var expect: (actual: any) => any;
  /* eslint-enable no-var */
}

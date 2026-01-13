import type TS from 'typescript';

declare module 'typescript' {
  interface Symbol {
    id: number;
  }

  interface Type {
    id: number;
  }
}

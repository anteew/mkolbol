import { type WrapOptions } from './wrap.js';
export declare function traced(module: string, options?: WrapOptions): <T extends (...args: any[]) => any>(target: T, context: ClassMethodDecoratorContext | ClassFieldDecoratorContext) => T | void;
//# sourceMappingURL=decorators.d.ts.map
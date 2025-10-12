import { wrap, type WrapOptions } from './wrap.js';

export function traced(module: string, options?: WrapOptions) {
  return function <T extends (...args: any[]) => any>(
    target: T,
    context: ClassMethodDecoratorContext | ClassFieldDecoratorContext
  ): T | void {
    const methodName = String(context.name);

    if (context.kind === 'method') {
      return wrap(target, methodName, module, options);
    }

    if (context.kind === 'field') {
      context.addInitializer(function (this: any) {
        const fieldValue = this[context.name];
        if (typeof fieldValue === 'function') {
          this[context.name] = wrap(fieldValue, methodName, module, options);
        }
      });
    }
  };
}

import { wrap } from './wrap.js';
export function traced(module, options) {
    return function (target, context) {
        const methodName = String(context.name);
        if (context.kind === 'method') {
            return wrap(target, methodName, module, options);
        }
        if (context.kind === 'field') {
            context.addInitializer(function () {
                const fieldValue = this[context.name];
                if (typeof fieldValue === 'function') {
                    this[context.name] = wrap(fieldValue, methodName, module, options);
                }
            });
        }
    };
}
//# sourceMappingURL=decorators.js.map
import { Kernel } from '../kernel/Kernel.js';
import { TimerSource } from '../modules/timer.js';
import { UppercaseTransform } from '../modules/uppercase.js';
import { ConsoleSink } from '../modules/consoleSink.js';
import { FilesystemSink } from '../modules/filesystem-sink.js';
import { PipeMeterTransform } from '../transforms/pipeMeter.js';
import { TeeTransform } from '../transforms/tee.js';
import { RateLimiterTransform } from '../transforms/rateLimiter.js';

export type ModuleConstructor = new (kernel: Kernel, ...args: any[]) => any;

export class ModuleRegistry {
  private registry = new Map<string, any>();

  constructor() {
    this.register('TimerSource', TimerSource);
    this.register('UppercaseTransform', UppercaseTransform);
    this.register('ConsoleSink', ConsoleSink);
    this.register('FilesystemSink', FilesystemSink);
    this.register('PipeMeterTransform', PipeMeterTransform);
    this.register('TeeTransform', TeeTransform);
    this.register('RateLimiterTransform', RateLimiterTransform);
  }

  register(name: string, constructor: any): void {
    this.registry.set(name, constructor);
  }

  get(name: string): any {
    return this.registry.get(name);
  }

  has(name: string): boolean {
    return this.registry.has(name);
  }
}

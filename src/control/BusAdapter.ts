import { PassThrough } from 'node:stream';

export interface BusAdapter {
  topic(name: string): PassThrough;
}

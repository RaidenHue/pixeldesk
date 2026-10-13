import { promises as fs } from 'node:fs';
import path from 'node:path';

export class JsonStore<T> {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly file: string,
    private readonly fallback: () => T,
    private readonly sanitize: (raw: unknown) => T,
  ) {}

  async load(): Promise<T> {
    try {
      return this.sanitize(JSON.parse(await fs.readFile(this.file, 'utf8')));
    } catch {
      return this.fallback();
    }
  }

  save(value: T): Promise<void> {
    const job = this.queue.then(async () => {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(value, null, 2), 'utf8');
      await fs.rename(tmp, this.file);
    });
    this.queue = job.catch(() => undefined);
    return job;
  }
}

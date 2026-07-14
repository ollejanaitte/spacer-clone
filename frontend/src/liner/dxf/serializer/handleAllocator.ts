export class HandleAllocator {
  private counter: number;

  constructor(start = 0x10) {
    this.counter = start;
  }

  next(): string {
    const handle = this.counter.toString(16).toUpperCase();
    this.counter += 1;
    return handle;
  }

  peek(): string {
    return this.counter.toString(16).toUpperCase();
  }
}

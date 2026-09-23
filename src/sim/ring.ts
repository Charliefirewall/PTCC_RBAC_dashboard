/**
 * Fixed-capacity Float32 ring buffer.
 *
 * Lives in the sim layer (not the store) because the engine now keeps per-vehicle speed
 * history and per-segment observations itself, and the sim must never import the store.
 * The store re-exports it, so existing call sites are unchanged.
 */
export class Ring {
  private buf: Float32Array;
  private head = 0;
  private len = 0;
  constructor(readonly capacity: number) {
    this.buf = new Float32Array(capacity);
  }
  push(v: number) {
    this.buf[this.head] = v;
    this.head = (this.head + 1) % this.capacity;
    if (this.len < this.capacity) this.len++;
  }
  get length(): number {
    return this.len;
  }
  toArray(): number[] {
    const out: number[] = new Array(this.len);
    for (let i = 0; i < this.len; i++) {
      out[i] = this.buf[(this.head - this.len + i + this.capacity) % this.capacity]!;
    }
    return out;
  }
  last(): number {
    return this.len ? this.buf[(this.head - 1 + this.capacity) % this.capacity]! : 0;
  }
}

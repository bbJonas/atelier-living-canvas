import { normalizeEvent } from './events.mjs';

/** Fixed-size in-memory event journal, bounded fan-out and no telemetry file IO. */
export class EventCollector {
  #events = [];
  #listeners = new Set();
  #seq = 0;
  #bucket = 0;
  #acceptedInBucket = 0;
  constructor({ capacity = 3000, maxPerSecond = 300, includeFilePaths = true, clock = Date.now } = {}) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20000) throw new RangeError('capacity');
    if (!Number.isInteger(maxPerSecond) || maxPerSecond < 1 || maxPerSecond > 10000) throw new RangeError('maxPerSecond');
    this.capacity = capacity;
    this.maxPerSecond = maxPerSecond;
    this.includeFilePaths = includeFilePaths;
    this.clock = clock;
    this.dropped = 0;
    this.rejected = 0;
  }
  ingest(input) {
    const items = Array.isArray(input) ? input : [input];
    if (!items.length || items.length > 200) throw new RangeError('Expected 1-200 events');
    // Validate the whole batch before changing state.
    let parsed;
    try {
      parsed = items.map(raw => normalizeEvent(raw, {
        now: this.clock(), includeFilePaths: this.includeFilePaths
      }));
    } catch (error) {
      this.rejected += items.length;
      throw error;
    }
    const second = Math.floor(this.clock() / 1000);
    if (second !== this.#bucket) {
      this.#bucket = second;
      this.#acceptedInBucket = 0;
    }
    if (this.#acceptedInBucket + parsed.length > this.maxPerSecond) {
      this.rejected += items.length;
      throw new RangeError('Event rate exceeded');
    }
    this.#acceptedInBucket += parsed.length;
    const emitted = [];
    for (const event of parsed) {
      const item = Object.freeze({ ...event, seq: ++this.#seq });
      this.#events.push(item);
      if (this.#events.length > this.capacity) {
        this.#events.shift();
        this.dropped++;
      }
      emitted.push(item);
      for (const fn of this.#listeners) {
        try { fn(item); } catch { /* observers cannot interrupt ingestion */ }
      }
    }
    return emitted;
  }
  subscribe(fn) {
    if (typeof fn !== 'function') throw new TypeError('listener');
    if (this.#listeners.size >= 32) throw new RangeError('Too many listeners');
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }
  snapshot() { return this.#events.slice(); }
  getAfter(seq) { return this.#events.filter(item => item.seq > seq); }
  get stats() {
    return { stored: this.#events.length, latestSeq: this.#seq,
      dropped: this.dropped, rejected: this.rejected, subscribers: this.#listeners.size };
  }
}

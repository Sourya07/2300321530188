/**
 * MinHeap-based priority queue for maintaining the top-K items.
 * Uses a min-heap so the smallest-priority item is always at the root —
 * when a new item with higher priority arrives, it replaces the root.
 *
 * No external algorithm libraries used (as per assignment rules).
 */

export interface ScoredItem<T> {
  score: number;
  item: T;
}

export class TopKHeap<T> {
  private heap: ScoredItem<T>[] = [];
  private readonly k: number;

  constructor(k: number) {
    this.k = k;
  }

  /**
   * Insert an item. If heap is full and item's score is higher than
   * the minimum, replace the minimum.
   */
  insert(score: number, item: T): void {
    if (this.heap.length < this.k) {
      this.heap.push({ score, item });
      this.bubbleUp(this.heap.length - 1);
    } else if (score > this.heap[0].score) {
      // Replace the minimum (root)
      this.heap[0] = { score, item };
      this.sinkDown(0);
    }
  }

  /**
   * Returns all items sorted by score descending (highest priority first).
   */
  getTopK(): ScoredItem<T>[] {
    return [...this.heap].sort((a, b) => b.score - a.score);
  }

  /**
   * Returns the current minimum score in the heap (the threshold).
   */
  getMinScore(): number {
    return this.heap.length > 0 ? this.heap[0].score : -Infinity;
  }

  get size(): number {
    return this.heap.length;
  }

  /**
   * Clears the heap.
   */
  clear(): void {
    this.heap = [];
  }

  // --- Heap internals ---

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].score <= this.heap[index].score) break;
      this.swap(parentIndex, index);
      index = parentIndex;
    }
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < length && this.heap[left].score < this.heap[smallest].score) {
        smallest = left;
      }
      if (right < length && this.heap[right].score < this.heap[smallest].score) {
        smallest = right;
      }
      if (smallest === index) break;
      this.swap(smallest, index);
      index = smallest;
    }
  }

  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }
}

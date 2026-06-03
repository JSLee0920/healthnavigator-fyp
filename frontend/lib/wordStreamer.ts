export interface WordStreamer {
  push: (chunk: string) => void;
  finish: () => Promise<void>;
}

export function createWordStreamer(
  onText: (text: string) => void,
  opts?: { wordIntervalMs?: number },
): WordStreamer {
  const interval = opts?.wordIntervalMs ?? 30;

  const queue: string[] = [];
  let buffer = "";
  let shown = "";
  let raf: number | null = null;
  let last = 0;
  let acc = 0;
  let done = false;
  let resolveDone: (() => void) | null = null;

  const drainBuffer = () => {
    const re = /\S+\s+/g;
    let consumed = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(buffer)) !== null) {
      queue.push(match[0]);
      consumed = re.lastIndex;
    }
    buffer = buffer.slice(consumed);
  };

  const tick = (ts: number) => {
    if (!last) last = ts;
    acc += ts - last;
    last = ts;

    let release = Math.floor(acc / interval);
    if (release > 0) {
      acc -= release * interval;
      if (queue.length > 30) release += Math.floor(queue.length / 10);
      while (release-- > 0 && queue.length) shown += queue.shift();
      onText(shown);
    }

    if (queue.length) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = null;
      last = 0;
      if (done) resolveDone?.();
    }
  };

  const ensureRunning = () => {
    if (raf === null) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  };

  return {
    push(chunk: string) {
      buffer += chunk;
      drainBuffer();
      ensureRunning();
    },
    finish() {
      done = true;
      if (buffer) {
        queue.push(buffer);
        buffer = "";
      }
      return new Promise<void>((resolve) => {
        resolveDone = resolve;
        if (queue.length === 0) {
          resolve();
        } else {
          ensureRunning();
        }
      });
    },
  };
}

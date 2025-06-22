import {describe, it, expect, vi} from 'vitest';
import { signal, compute, isSignal } from '../src';

describe('Signal', () => {
  it('should create a signal with initial value', () => {
    const count = signal(0);
    expect(count.value).toBe(0);
  });

  it('should update signal value', () => {
    const count = signal(0);
    count.value = 1;
    expect(count.value).toBe(1);
  });

  it('should notify subscribers when value changes', () => {
    const count = signal(0);
    let newValue = 0;

    const subscriber = (value: number) => {
      newValue = value;
    };
    const mockFn = vi.fn(subscriber);
    count.subscribe(mockFn);

    const targetValue = 5;
    count.value = targetValue;
    expect(newValue).toBe(targetValue);
    expect(mockFn).toHaveBeenCalledOnce();
  });

  it('should override keyed subscribers', () => {
    const count = signal(0);

    const first = vi.fn();
    const second = vi.fn();

    count.subscribe(first, "component");
    count.value = 1;
    count.subscribe(second, "component");
    count.value = 2;

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it('should correctly unsubscribe', () => {
    const count = signal(0);

    const first = vi.fn();

    count.subscribe(first);
    count.unsubscribe(first);

    expect(first).toHaveBeenCalledTimes(0);
  });
});

describe('compute', () => {
  it('should compute derived values from signals', () => {
    const count = signal(1);
    const doubled = compute((value) => value * 2, count);
    
    expect(doubled.value).toBe(2);
    
    count.value = 2;
    expect(doubled.value).toBe(4);
  });
});

describe('isSignal', () => {
  it('should identify signal objects', () => {
    const count = signal(0);

    expect(isSignal(count)).toBe(true);
    expect(isSignal({
      type: "jess-signal"
    })).toBe(true);

    expect(isSignal({})).toBe(false);
    expect(isSignal(null)).toBe(false);
  });
});
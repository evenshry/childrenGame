import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
};

export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  const lastRan = useRef(Date.now());

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRan.current >= delay) {
        callback(...args);
        lastRan.current = now;
      }
    },
    [callback, delay]
  );
};

export const useMemoCompare = <T>(
  value: T,
  compare: (prev: T | undefined, next: T) => boolean
): T => {
  const valueRef = useRef<T>();

  if (!compare(valueRef.current, value)) {
    valueRef.current = value;
  }

  return valueRef.current as T;
};

export const createMemoizedSelector = <State, Result>(
  selector: (state: State) => Result,
  equalityFn: (a: Result, b: Result) => boolean = (a, b) => a === b
) => {
  let lastState: State | undefined;
  let lastResult: Result | undefined;

  return (state: State): Result => {
    if (lastState === state) {
      return lastResult as Result;
    }

    const newResult = selector(state);

    if (lastResult !== undefined && equalityFn(lastResult, newResult)) {
      return lastResult as Result;
    }

    lastState = state;
    lastResult = newResult;

    return newResult;
  };
};

export const batchUpdates = <T extends (...args: any[]) => void>(
  callback: T,
  batchSize: number = 10,
  interval: number = 16
): T => {
  let batch: Parameters<T>[] = [];
  let timeoutId: NodeJS.Timeout | null = null;

  const flush = () => {
    const currentBatch = [...batch];
    batch = [];
    currentBatch.forEach(args => callback(...args));
  };

  return ((...args: Parameters<T>) => {
    batch.push(args);

    if (batch.length >= batchSize) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      flush();
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        timeoutId = null;
        flush();
      }, interval);
    }
  }) as T;
};

export const createCache = <Key, Value>(
  maxSize: number = 100,
  ttl: number = 5 * 60 * 1000
) => {
  const cache = new Map<Key, { value: Value; timestamp: number }>();
  const order: Key[] = [];

  const get = (key: Key): Value | undefined => {
    const item = cache.get(key);
    if (!item) return undefined;

    if (Date.now() - item.timestamp > ttl) {
      cache.delete(key);
      const index = order.indexOf(key);
      if (index > -1) order.splice(index, 1);
      return undefined;
    }

    const index = order.indexOf(key);
    if (index > -1) {
      order.splice(index, 1);
    }
    order.push(key);

    return item.value;
  };

  const set = (key: Key, value: Value) => {
    if (cache.size >= maxSize && order.length > 0) {
      const oldestKey = order.shift();
      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }

    cache.set(key, { value, timestamp: Date.now() });

    const index = order.indexOf(key);
    if (index > -1) {
      order.splice(index, 1);
    }
    order.push(key);
  };

  const clear = () => {
    cache.clear();
    order.length = 0;
  };

  return { get, set, clear, size: () => cache.size };
};

export const useCache = <T>(value: T, key: string) => {
  const cacheRef = useRef<Map<string, T>>(new Map());

  useEffect(() => {
    return () => {
      cacheRef.current.delete(key);
    };
  }, [key]);

  const setCache = useCallback((val: T) => {
    cacheRef.current.set(key, val);
  }, [key]);

  const getCache = useCallback(() => {
    return cacheRef.current.get(key);
  }, [key]);

  return { setCache, getCache };
};

export const performanceMonitor = {
  marks: new Map<string, number>(),
  
  start: (label: string) => {
    performanceMonitor.marks.set(label, performance.now());
  },
  
  end: (label: string): number | null => {
    const start = performanceMonitor.marks.get(label);
    if (start === undefined) return null;
    
    const duration = performance.now() - start;
    performanceMonitor.marks.delete(label);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  },
  
  measure: (label: string, fn: () => void) => {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  },
};

export const useLazyLoading = <T>(
  loadFn: () => Promise<T>,
  deps: React.DependencyList = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await loadFn();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err as Error);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload: load };
};

export default {
  useDebounce,
  useThrottle,
  useMemoCompare,
  createMemoizedSelector,
  batchUpdates,
  createCache,
  useCache,
  performanceMonitor,
  useLazyLoading,
};

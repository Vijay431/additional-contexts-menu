// Utility functions for testing function detection and copying

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) {
    return 0;
  }
  return Math.round((value / total) * 100 * 100) / 100; // Round to 2 decimal places
};

export async function fetchUserData(userId: string): Promise<any> {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
}

const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

export { debounce };

export class DataProcessor {
  private data: any[] = [];

  constructor(initialData: any[] = []) {
    this.data = initialData;
  }

  public addItem(item: any): void {
    this.data.push(item);
  }

  public filterItems(predicate: (item: any) => boolean): any[] {
    return this.data.filter(predicate);
  }

  public async processItems(processor: (item: any) => Promise<any>): Promise<any[]> {
    const results = [];
    for (const item of this.data) {
      const result = await processor(item);
      results.push(result);
    }
    return results;
  }

  get itemCount(): number {
    return this.data.length;
  }
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export function createApiResponse<T>(data: T, message = 'Success'): ApiResponse<T> {
  return {
    data,
    message,
    success: true,
  };
}

// LocalStorage utility helper
export const createLocalStorageHelper = <T>(key: string, initialValue: T) => {
  const getStoredValue = (): T => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  };

  const setStoredValue = (value: T | ((val: T) => T)): void => {
    try {
      const currentValue = getStoredValue();
      const valueToStore = value instanceof Function ? value(currentValue) : value;
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  const removeStoredValue = (): void => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  };

  return {
    get: getStoredValue,
    set: setStoredValue,
    remove: removeStoredValue,
  };
};

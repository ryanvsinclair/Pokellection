"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface CartCountContextValue {
  count: number;
  setCount: (count: number) => void;
}

const CartCountContext = createContext<CartCountContextValue | null>(null);

interface Props {
  initialCount: number;
  children: ReactNode;
}

export function CartCountProvider({ initialCount, children }: Props) {
  const [count, setCountState] = useState(initialCount);

  useEffect(() => {
    setCountState(initialCount);
  }, [initialCount]);

  const setCount = useCallback((next: number) => {
    setCountState(Math.max(0, next));
  }, []);

  const value = useMemo(() => ({ count, setCount }), [count, setCount]);

  return (
    <CartCountContext.Provider value={value}>{children}</CartCountContext.Provider>
  );
}

export function useCartCount(): CartCountContextValue {
  const ctx = useContext(CartCountContext);
  if (!ctx) {
    throw new Error("useCartCount must be used within CartCountProvider");
  }
  return ctx;
}

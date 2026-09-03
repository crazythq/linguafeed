"use client";

import { useCallback, useSyncExternalStore } from "react";
import { loadUserState, saveUserState } from "@/lib/storage";
import type { UserState } from "@/lib/types";

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): UserState {
  return loadUserState();
}

function getServerSnapshot(): UserState {
  return loadUserState();
}

export function useUserState() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const update = useCallback((updater: (current: UserState) => UserState) => {
    const next = updater(loadUserState());
    saveUserState(next);
    emit();
  }, []);

  return { state, update, hydrated };
}

"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getUserStateSnapshot, loadUserState, saveUserState, SERVER_USER_STATE } from "@/lib/storage";
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
  return getUserStateSnapshot();
}

function getServerSnapshot(): UserState {
  return SERVER_USER_STATE;
}

const subscribeHydrated = (): (() => void) => () => undefined;
const getHydratedSnapshot = (): boolean => true;
const getHydratedServerSnapshot = (): boolean => false;

export function useUserState() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    subscribeHydrated,
    getHydratedSnapshot,
    getHydratedServerSnapshot,
  );

  const update = useCallback((updater: (current: UserState) => UserState) => {
    const next = updater(loadUserState());
    saveUserState(next);
    emit();
  }, []);

  return { state, update, hydrated };
}

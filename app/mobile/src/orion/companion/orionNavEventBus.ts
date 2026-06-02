export type OrionNavigationEvent =
  | { type: 'navigation_started'; tripId: string }
  | { type: 'reroute' }
  | { type: 'arrival' }
  | { type: 'reward_earned'; gemsDelta: number }
  | { type: 'heavy_traffic' }
  | { type: 'navigation_reset' };

type OrionNavigationEventListener = (event: OrionNavigationEvent) => void;

const listeners = new Set<OrionNavigationEventListener>();

export function publishOrionNavigationEvent(event: OrionNavigationEvent): void {
  listeners.forEach((listener) => listener(event));
}

export function subscribeOrionNavigationEvents(listener: OrionNavigationEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetOrionNavigationEventBusForTests(): void {
  listeners.clear();
}

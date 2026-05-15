import * as Haptics from 'expo-haptics';

async function safely(run: Promise<void>) {
  try {
    await run;
  } catch {
    // Haptics can be unavailable in simulators / low-power native states.
  }
}

export function hapticTurnWarning() {
  return safely(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function hapticManeuverComplete() {
  return safely(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function hapticArrival() {
  return safely(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function hapticOfferNearby() {
  return safely(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function hapticHazardAhead() {
  return safely(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function hapticSpeedAlert() {
  return safely(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}

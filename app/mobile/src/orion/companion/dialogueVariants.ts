import type { OrionCompanionEventType, DialogueVariant } from './types';

export const DIALOGUE_VARIANTS: Record<OrionCompanionEventType, DialogueVariant[]> = {
  drive_started: [
    { id: 'ds1', template: "Alright — {{destination}}. I'll keep it useful, not chatty." },
    { id: 'ds2', template: 'Trip on. About {{etaMinutes}} min if traffic behaves.' },
    { id: 'ds3', template: "Let's roll to {{destination}}. I've got the boring updates." },
    { id: 'ds4', template: 'Navigation live. Ping me if you want a stop.', moods: ['witty', 'hype'] },
    { id: 'ds5', template: 'Heading to {{destination}}. Smooth line today would be nice.' },
  ],
  smooth_drive: [
    { id: 'sd1', template: 'Cruise mode. The road is being suspiciously cooperative.' },
    { id: 'sd2', template: 'Quiet stretch — I promise not to narrate every tree.' },
    { id: 'sd3', template: '{{currentRoad}} is behaving. Enjoy the rare peace.' },
    { id: 'sd4', template: 'Still smooth. Your future self thanks you for not rushing.' },
    { id: 'sd5', template: 'Easy miles. I brought vibes, not spoilers.', moods: ['witty', 'hype'] },
    { id: 'sd6', template: 'All calm out here. Holler if you want coffee logic.' },
  ],
  heavy_traffic: [
    { id: 'ht1', template: 'Traffic thickened up — still about {{etaMinutes}} min to {{destination}}.' },
    { id: 'ht2', template: 'Congestion ahead. Deep breaths; we are still moving.' },
    { id: 'ht3', template: 'Slow zone on {{currentRoad}}. ETA drifted a bit — I am watching it.' },
    { id: 'ht4', template: 'Backup ahead. Not fun, but we have a line out.' },
    { id: 'ht5', template: 'Heavy traffic patch. I will stay quiet unless it changes.' },
  ],
  reroute: [
    { id: 'rr1', template: 'New route locked in. Follow the fresh line.' },
    { id: 'rr2', template: 'Rerouting — I found a cleaner path. Stay with me.' },
    { id: 'rr3', template: 'Route updated. No drama, just a better sequence.' },
    { id: 'rr4', template: 'Adjusted the plan. Next turns are the ones that matter.' },
  ],
  long_drive: [
    { id: 'ld1', template: 'Long haul check-in — you have been rolling {{driveDurationMinutes}} minutes. Still good?' },
    { id: 'ld2', template: '{{driveDurationMinutes}} minutes in. Hydrate when it is safe.' },
    { id: 'ld3', template: 'Marathon mode. About {{distanceMiles}} mi left to {{destination}}.' },
    { id: 'ld4', template: 'Steady driver energy. We will celebrate at {{destination}}.' },
  ],
  reward_earned: [
    { id: 'rw1', template: '{{gemsEarnedThisTrip}} gems this trip so far — nice momentum.' },
    { id: 'rw2', template: 'Gem alert. Safe miles are paying off.' },
    { id: 'rw3', template: 'You just stacked gems. Keep that smooth pace.' },
    { id: 'rw4', template: 'Rewards ticking up — {{gemsEarnedThisTrip}} gems on this drive.' },
  ],
  arrival: [
    { id: 'ar1', template: 'You made it to {{destination}}. Clean finish.' },
    { id: 'ar2', template: 'Arrived at {{destination}}. I will dial the energy down.' },
    { id: 'ar3', template: 'Destination reached. Park safe, stretch if you can.' },
    { id: 'ar4', template: '{{destination}} — done. Good drive.', moods: ['calm', 'quiet'] },
  ],
  safety_caution: [
    { id: 'sf1', template: 'Heads up — hazard reported ahead. Eyes on the road.' },
    { id: 'sf2', template: 'Caution ahead. I will keep directions clear and short.' },
    { id: 'sf3', template: 'Incident nearby. Slow down early if you can.' },
    { id: 'sf4', template: 'Safety ping — something reported on your route. Stay alert.' },
  ],
  idle_checkin: [
    { id: 'ic1', template: 'Parked mode. Want a recap of your week or a route idea?' },
    { id: 'ic2', template: 'Hey — not driving? I can help with scores, gems, or a quick route.' },
    { id: 'ic3', template: 'Still here when you need me. Insights look ready if you scroll.' },
    { id: 'ic4', template: 'Off the road? Ask me about your SnapRoad stats anytime.' },
    { id: 'ic5', template: 'Quiet garage energy. Tap Orion when you are ready to plan.' },
  ],
};

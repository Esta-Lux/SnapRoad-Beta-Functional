/** Public App Store / Play Store URLs for driver app install CTAs. */
export const SNAPROAD_IOS_APP_STORE_URL =
  'https://apps.apple.com/app/apple-store/id6761516426'
export const SNAPROAD_ANDROID_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.snaproad.app'

export type MobilePlatform = 'ios' | 'android' | 'other'

export function detectMobilePlatform(): MobilePlatform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}

export function storeUrlForPlatform(platform: MobilePlatform): string {
  if (platform === 'ios') return SNAPROAD_IOS_APP_STORE_URL
  if (platform === 'android') return SNAPROAD_ANDROID_PLAY_STORE_URL
  return SNAPROAD_IOS_APP_STORE_URL
}

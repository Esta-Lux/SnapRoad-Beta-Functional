export function parseEnvBool(raw: string | undefined, defaultVal: boolean): boolean {
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return defaultVal;
}

export function isNativeFullScreenAllowed(nativeSdkEnabled: boolean, logicSdkEnabled: boolean): boolean {
  return nativeSdkEnabled && !logicSdkEnabled;
}


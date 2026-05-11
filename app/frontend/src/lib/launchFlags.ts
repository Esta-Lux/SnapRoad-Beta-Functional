const envBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value == null || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

export const FAMILY_MODE_LAUNCH_ENABLED = envBool(
  import.meta.env.VITE_ENABLE_FAMILY_MODE || import.meta.env.VITE_PUBLIC_ENABLE_FAMILY_MODE,
  false,
);

export const SUPPORT_EMAIL = 'support@snaproad.co';

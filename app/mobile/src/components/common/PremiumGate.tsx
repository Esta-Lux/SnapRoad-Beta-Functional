import React, { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  featureName?: string;
  onUpgrade?: () => void;
}

export default function PremiumGate({ children, featureName, onUpgrade }: Props) {
  void featureName;
  void onUpgrade;
  return <>{children}</>;
}

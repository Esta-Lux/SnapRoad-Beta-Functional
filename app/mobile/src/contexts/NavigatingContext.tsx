import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface NavigatingContextType {
  isNavigating: boolean;
  setIsNavigating: (v: boolean) => void;
}

const NavigatingContext = createContext<NavigatingContextType>({
  isNavigating: false,
  setIsNavigating: () => {},
});

export function NavigatingProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  return (
    <NavigatingContext.Provider value={{ isNavigating, setIsNavigating }}>
      {children}
    </NavigatingContext.Provider>
  );
}

/** Tab chrome / global “driving session” flag — hide tab bar while true. */
export function useNavigationMode() {
  return useContext(NavigatingContext);
}

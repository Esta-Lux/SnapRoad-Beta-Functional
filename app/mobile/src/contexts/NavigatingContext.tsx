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

export function useNavigatingState() {
  return useContext(NavigatingContext);
}

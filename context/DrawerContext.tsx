import React, { createContext, useState, useContext, ReactNode } from 'react';

interface DrawerContextType {
  isMenuVisible: boolean;
  openMenu: () => void;
  closeMenu: () => void;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export const useDrawer = () => {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error('useDrawer must be used within a DrawerProvider');
  }
  return context;
};

export const DrawerProvider = ({ children }: { children: ReactNode }) => {
  const [isMenuVisible, setMenuVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  return (
    <DrawerContext.Provider value={{ isMenuVisible, openMenu, closeMenu }}>
      {children}
    </DrawerContext.Provider>
  );
};

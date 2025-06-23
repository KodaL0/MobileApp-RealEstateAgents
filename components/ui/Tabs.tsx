import React, { createContext, useContext, useState, ReactNode } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

type TabsContextType = {
  value: string;
  onChange: (value: string) => void;
};

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

type TabsProps = {
  defaultValue: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Tabs({ defaultValue, children, style }: TabsProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ value, onChange: setValue }}>
      <View style={style}>{children}</View>
    </TabsContext.Provider>
  );
}

type TabsContentProps = {
  value: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function TabsContent({ value, children, style }: TabsContentProps) {
  const { value: selectedValue } = useTabs();

  if (value !== selectedValue) {
    return null;
  }

  return <View style={style}>{children}</View>;
}
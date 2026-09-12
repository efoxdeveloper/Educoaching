"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type TitleContextValue = {
  title: string;
  setTitle: (t: string) => void;
};

const TitleContext = createContext<TitleContextValue>({ title: "", setTitle: () => {} });

export function TitleProvider({ children, initialTitle = "" }: { children: ReactNode; initialTitle?: string }) {
  const [title, setTitle] = useState(initialTitle);
  return <TitleContext.Provider value={{ title, setTitle }}>{children}</TitleContext.Provider>;
}

export function useTitle() {
  return useContext(TitleContext);
}

export function TitleSetter({ title }: { title: string }) {
  const { setTitle } = useTitle();
  useEffect(() => {
    setTitle(title);
  }, [title, setTitle]);
  return null;
}

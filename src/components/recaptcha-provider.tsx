"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

interface RecaptchaContextValue {
  executeRecaptcha: (action: string) => Promise<string>;
}

const RecaptchaContext = createContext<RecaptchaContextValue>({
  executeRecaptcha: async () => "",
});

export function useRecaptcha() {
  return useContext(RecaptchaContext);
}

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export function RecaptchaProvider({ children }: { children: React.ReactNode }) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const loaded = useRef(false);

  useEffect(() => {
    if (!siteKey || loaded.current) return;
    loaded.current = true;

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    document.head.appendChild(script);
  }, [siteKey]);

  const executeRecaptcha = useCallback(
    async (action: string): Promise<string> => {
      if (!siteKey || !window.grecaptcha) return "";

      return new Promise((resolve) => {
        window.grecaptcha!.ready(async () => {
          try {
            const token = await window.grecaptcha!.execute(siteKey, { action });
            resolve(token);
          } catch {
            resolve("");
          }
        });
      });
    },
    [siteKey]
  );

  return (
    <RecaptchaContext.Provider value={{ executeRecaptcha }}>
      {children}
    </RecaptchaContext.Provider>
  );
}

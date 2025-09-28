import { useState, useCallback } from "react";

export const useProxy = (initialProxyTarget = "http://localhost:8080") => {
  const [useProxy, setUseProxy] = useState(false);
  const [proxyTarget, setProxyTarget] = useState(initialProxyTarget);

  const checkAndEnableProxy = useCallback((reqlineText: string) => {
    const localhostRegex = /localhost:\d+/i;
    const hasLocalhost = localhostRegex.test(reqlineText);

    if (hasLocalhost) {
      // Always enable proxy when localhost is detected
      setUseProxy(true);
      // Extract the localhost URL from the reqline
      const urlMatch = reqlineText.match(/URL\s+(https?:\/\/localhost:\d+)/i);
      if (urlMatch) {
        setProxyTarget(urlMatch[1]);
      } else {
        // Default to common localhost port
        setProxyTarget("http://localhost:8080");
      }
    } else {
      // Disable proxy if no localhost detected
      setUseProxy(false);
    }
  }, []);

  const toggleProxy = useCallback(() => {
    setUseProxy((prev) => !prev);
  }, []);

  const updateProxyTarget = useCallback((target: string) => {
    setProxyTarget(target);
  }, []);

  return {
    useProxy,
    proxyTarget,
    checkAndEnableProxy,
    toggleProxy,
    updateProxyTarget,
  };
};

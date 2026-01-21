import { createContext, useContext, useEffect, useState } from "react";

const UpdateContext = createContext(null);

export function UpdateProvider({ children }) {
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState(null);
  const [installedVersion, setInstalledVersion] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (window.api?.getAppVersion) {
      window.api.getAppVersion().then(v => {
        setInstalledVersion(v);
      });
    }

    if (!window.api?.check()) return;

    const offStatus = window.api.onStatus(data => {
      setStatus(data.status);
      if (data.version) setVersion(data.version);
      if (data.message) setError(data.message);
    });

    const offProgress = window.api.onProgress(data => {
      setStatus("downloading");
      setProgress(data.percent);
    });

    window.api.check();

    return () => {
      offStatus?.();
      offProgress?.();
    };
  }, []);

  const check = () => window.api?.check();
  const download = () => window.api?.download();
  const install = () => window.api?.install();

  return (
    <UpdateContext.Provider
      value={{
        status,
        progress,
        version,
        installedVersion,
        error,
        check,
        download,
        install,
      }}
    >
      {children}
    </UpdateContext.Provider>
  );
}

export function useUpdater() {
  return useContext(UpdateContext);
}
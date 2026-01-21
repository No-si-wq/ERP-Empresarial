import { createContext, useContext, useEffect, useState } from "react";

const UpdateContext = createContext(null);

export function UpdateProvider({ children }) {
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!window.updater) return;

    window.updater.check();

    const offStatus = window.updater.onStatus(data => {
      setStatus(data.status);
      if (data.version) setVersion(data.version);
      if (data.message) setError(data.message);
    });

    const offProgress = window.updater.onProgress(data => {
      setStatus("downloading");
      setProgress(data.percent);
    });

    return () => {
      offStatus?.();
      offProgress?.();
    };
  }, []);

  const check = () => window.updater?.check();
  const download = () => window.updater?.download();
  const install = () => window.updater?.install();

  return (
    <UpdateContext.Provider
      value={{
        status,
        progress,
        version,
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
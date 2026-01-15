import { createContext, useContext, useEffect, useState } from "react";

const UpdateContext = createContext(null);

export function UpdateProvider({ children }) {
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState(null);

  useEffect(() => {
    if (!window.updater) return;

    window.updater.onStatus(data => {
      setStatus(data.status);
      if (data.version) setVersion(data.version);
    });

    window.updater.onProgress(data => {
      setProgress(data.percent);
    });
  }, []);

  const check = () => window.updater.check();
  const download = () => window.updater.download();
  const install = () => window.updater.install();

  return (
    <UpdateContext.Provider
      value={{
        status,
        progress,
        version,
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
// src/hooks/useAddressData.ts
import { useEffect, useState } from "react";
import axios from "axios";
import { IProvince } from "@/types";

export function useAddressData() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [provinces, setProvinces] = useState<IProvince[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const local = localStorage.getItem("addressData");
        const localVersion = localStorage.getItem("addressVersion");

        const { data: versionResp } = await axios.get("/api/address/version");
        const currentVersion = versionResp?.version;

        setVersion(currentVersion);

        if (local && localVersion === currentVersion) {
          if (!cancelled) setProvinces(JSON.parse(local));
          return;
        }

        const { data: provincesResp } = await axios.get("/api/address");
        if (!cancelled) {
          setProvinces(provincesResp);
          localStorage.setItem("addressData", JSON.stringify(provincesResp));
          localStorage.setItem("addressVersion", currentVersion);
        }
      } catch (err) {
        console.error("useAddressData.load:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { provinces, loading, version };
}

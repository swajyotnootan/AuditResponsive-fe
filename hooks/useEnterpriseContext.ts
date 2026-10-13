import { enterpriseAPI } from "@/services/enterpriseAPI";
import { useEffect, useState } from "react";

export function useEnterpriseContext(companyId?: string | number | null) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [effectiveCompanyId, setEffectiveCompanyId] = useState<string | null>(
    companyId != null ? String(companyId) : null,
  );
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [plants, setPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Fetch ALL companies once
  useEffect(() => {
    enterpriseAPI
      .getCompanies()
      .then((list: any[]) => {
        const safe = Array.isArray(list) ? list : [];
        setCompanies(safe);

        // If no company was given, fall back to the first one
        if (!effectiveCompanyId && safe.length > 0) {
          setEffectiveCompanyId(String(safe[0].id));
        }
      })
      .catch(() => setCompanies([]));
  }, []); // 👈 only once

  // 2. When companyId prop changes, override effective
  useEffect(() => {
    if (companyId != null) {
      setEffectiveCompanyId(String(companyId));
    }
  }, [companyId]);

  // 3. Fetch company details + plants when effectiveCompanyId changes
  useEffect(() => {
    if (!effectiveCompanyId) return;

    let cancelled = false;
    setLoading(true);

    Promise.all([
      enterpriseAPI.getCompanyById(effectiveCompanyId).catch(() => null),
      enterpriseAPI.getPlantsByCompany(effectiveCompanyId).catch(() => []),
    ])
      .then(([c, p]) => {
        if (cancelled) return;
        setCompanyName((c as any)?.name ?? null);
        setPlants(Array.isArray(p) ? p : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveCompanyId]);

  return {
    companyId: effectiveCompanyId,
    companyName,
    companies, // 👈 full list for dropdowns
    plants,
    loading,
  };
}

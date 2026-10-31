import { useEffect, useState } from "react";
import type { Admin } from "@/lib/api";

export function useAuth() {
  const [user, setUser] = useState<Admin | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const savedAdmin = localStorage.getItem("admin");

    if (token && savedAdmin) {
      try {
        setUser(JSON.parse(savedAdmin));
        setIsAdmin(true);
      } catch {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("admin");
        setUser(null);
        setIsAdmin(false);
      }
    } else {
      setUser(null);
      setIsAdmin(false);
    }

    setLoading(false);
  }, []);

  return { user, isAdmin, loading };
}

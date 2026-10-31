import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Coffee, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LanguageSwitch, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
});

function AdminLogin() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn() {
    if (!email || !password) {
      toast.error(t("login.required"));
      return;
    }

    setLoading(true);
    try {
      const data = await api.loginAdmin(email, password);
      localStorage.setItem("adminToken", data.access_token);
      localStorage.setItem("admin", JSON.stringify(data.admin));
      toast.success(t("login.welcome"));
      navigate({ to: "/admin" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("login.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass w-full max-w-md rounded-3xl p-8">

          <div className="flex items-center justify-between mb-6">
          <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-primary shadow-sm hover:bg-accent/10 hover:border-accent hover:text-accent transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> {t("common.backToKiosk")}
          </Link>
          <LanguageSwitch />
          </div>

          <div className="flex items-center gap-2 text-primary mb-6">
            <Coffee className="h-8 w-8 text-accent" />
            <div>
              <div className="text-xl font-bold">BrewHub Admin</div>
              <div className="text-xs text-muted-foreground">
                {t("login.subtitle")}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>{t("common.email")}</Label>
              <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && signIn()}
                  placeholder="admin@gmail.com"
              />
            </div>

            <div>
              <Label>{t("login.password")}</Label>
              <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && signIn()}
                  placeholder="admin123"
              />
            </div>

            <Button className="w-full" onClick={signIn} disabled={loading}>
              {loading ? t("login.signingIn") : t("login.signIn")}
            </Button>
          </div>
        </div>
      </div>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Coffee, Building2, Search } from "lucide-react";
import { api } from "@/lib/api";
import { SiteHeader } from "@/components/SiteHeader";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const { data: companies, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const companies = await api.getCompanies();
      return companies.sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  const term = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!term) return companies ?? [];
    return (companies ?? []).filter((c) => c.name.toLowerCase().includes(term));
  }, [companies, term]);

  return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container mx-auto px-4 py-10 sm:py-16">
          <section className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-sm text-mocha shadow-sm border border-border/60 mb-6">
              <Coffee className="h-4 w-4 text-accent" />
              <span>{t("home.welcome")}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-primary leading-tight">
              {t("home.titleStart")} <span className="text-accent">{t("home.titleAccent")}</span> {t("home.titleEnd")}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground">
              {t("home.subtitle")}
            </p>
          </section>

          <section>
            <div className="flex flex-col items-center gap-4 mb-10 text-center">
              <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
                <Building2 className="h-5 w-5" /> {t("home.companies")}
                {companies && (
                    <span className="text-sm font-normal text-muted-foreground">
                  ({filtered.length}{term ? ` ${t("home.countOf", { total: companies.length })}` : ""})
                </span>
                )}
              </h2>
              <div className="relative w-full sm:w-[520px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("home.search")}
                    className="pl-11 h-13 text-base rounded-xl shadow-sm"
                />
              </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-40 rounded-2xl bg-muted/60 animate-pulse" />
                  ))}
                </div>
            ) : filtered.length > 0 ? (
                <div className="max-h-[70vh] overflow-y-auto pr-1 -mr-1 scroll-smooth rounded-xl">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 pb-2">
                    {filtered.map((c) => (
                        <Link
                            key={c.id}
                            to="/employees/$companyId"
                            params={{ companyId: String(c.id) }}
                            className="glass glass-focus group flex flex-col items-center justify-center gap-3 h-40 sm:h-48 rounded-2xl transition-all p-4 focus:outline-none"
                        >
                          {c.logo_url ? (
                              <img src={c.logo_url} alt={c.name} className="h-24 w-24 object-contain rounded-2xl bg-white/70 p-1.5" />
                          ) : (
                              <div
                                  className="h-24 w-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-primary-foreground"
                                  style={{ background: "var(--gradient-coffee)" }}
                              >
                                {c.name.charAt(0)}
                              </div>
                          )}
                          <div className="text-center font-semibold text-primary group-hover:text-accent transition-colors text-base sm:text-lg">
                            {c.name}
                          </div>
                        </Link>
                    ))}
                  </div>
                </div>
            ) : (
                <p className="text-muted-foreground text-center py-12">
                  {term ? t("home.noMatch") : t("home.noCompanies")}
                </p>
            )}
          </section>
        </main>
        <footer className="text-center py-6 text-sm text-muted-foreground">
          {t("home.footer")}
        </footer>
      </div>
  );
}

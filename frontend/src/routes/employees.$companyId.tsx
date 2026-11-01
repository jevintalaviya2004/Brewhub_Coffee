import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, UserPlus, Search } from "lucide-react";
import { api, saveSelectedUser } from "@/lib/api";
import { SiteHeader } from "@/components/SiteHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { errorText, useI18n } from "@/lib/i18n";
import { EmployeeFormFields } from "@/components/EmployeeFormFields";
import {
  backendFieldError,
  hasErrors,
  validateEmployee,
  type EmployeeField,
  type FieldErrors,
} from "@/lib/validation";

const EMPLOYEE_FIELDS = ["first_name", "last_name", "email", "pin"] as const;

export const Route = createFileRoute("/employees/$companyId")({
  component: EmployeesPage,
});

function EmployeesPage() {
  const { t } = useI18n();
  const { companyId } = Route.useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", pin: "" });
  const [errors, setErrors] = useState<FieldErrors<EmployeeField>>({});
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: company } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const companies = await api.getCompanies();
      return companies.find((c) => String(c.id) === String(companyId)) ?? null;
    },
  });

  const { data: employees, refetch } = useQuery({
    queryKey: ["employees", companyId],
    queryFn: async () => {
      const users = await api.getUsersByCompany(companyId);
      return users.sort((a, b) => a.first_name.localeCompare(b.first_name));
    },
  });

  const [visible, setVisible] = useState(120);

  const term = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!term) return employees ?? [];
    return (employees ?? []).filter((e) => {
      const fn = e.first_name?.toLowerCase() ?? "";
      const ln = e.last_name?.toLowerCase() ?? "";
      const id = e.pin?.toLowerCase() ?? "";
      return (
        fn.startsWith(term) ||
        ln.startsWith(term) ||
        id.startsWith(term) ||
        fn.includes(term) ||
        ln.includes(term) ||
        id.includes(term)
      );
    });
  }, [employees, term]);

  // Predictive results: prefix matches first, capped at 6
  const suggestions = useMemo(() => {
    if (!term) return [];
    const prefix = (employees ?? []).filter((e) => {
      const fn = e.first_name?.toLowerCase() ?? "";
      const ln = e.last_name?.toLowerCase() ?? "";
      const id = e.pin?.toLowerCase() ?? "";
      return fn.startsWith(term) || ln.startsWith(term) || id.startsWith(term);
    });
    return prefix.slice(0, 6);
  }, [employees, term]);

  function updateField(field: EmployeeField, value: string) {
    const next = { ...form, [field]: value };
    setForm(next);
    // After the first "Save", the messages update while the user types.
    if (triedSubmit) setErrors(validateEmployee(next, company?.email_domains));
  }

  function openDialog() {
    setForm({ first_name: "", last_name: "", email: "", pin: "" });
    setErrors({});
    setTriedSubmit(false);
    setOpen(true);
  }

  async function handleCreate() {
    setTriedSubmit(true);
    const found = validateEmployee(form, company?.email_domains);
    setErrors(found);
    if (hasErrors(found)) {
      toast.error(t("val.fixErrors"));
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.createUser({
        company_id: Number(companyId),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        pin: form.pin.trim(),
      });
      const data = created[0];
      if (!data) throw new Error(t("emp.notCreated"));
      saveSelectedUser(data, company);
      toast.success(t("emp.welcome", { name: data.first_name }));
      setOpen(false);
      await refetch();
      navigate({ to: "/order/$employeeId", params: { employeeId: String(data.id) } });
    } catch (error) {
      const fieldError = backendFieldError(error, EMPLOYEE_FIELDS);
      if (fieldError) setErrors(fieldError);
      toast.error(errorText(t, error, "emp.createFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-8 sm:py-12">
        <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/60 text-sm font-medium text-mocha hover:text-primary hover:border-accent hover:bg-accent/10 transition-all shadow-sm mb-6">
          <ArrowLeft className="h-4 w-4" /> {t("emp.backToCompanies")}
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold text-primary">{company?.name ?? t("emp.fallbackTitle")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("emp.tapName")}
        </p>

        <div className="mt-6 sticky top-2 z-10">
          <div className="relative glass-strong rounded-xl p-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); setVisible(120); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder={t("emp.search")}
              className="pl-10 h-12 text-base border-0 bg-transparent"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-border bg-popover shadow-[var(--shadow-warm)] overflow-hidden">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { saveSelectedUser(s, company); navigate({ to: "/order/$employeeId", params: { employeeId: String(s.id) } }); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-accent/20 flex items-center justify-between gap-3"
                  >
                    <span className="font-medium text-primary">{s.first_name} {s.last_name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{s.pin ?? "—"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          <button
            onClick={openDialog}
            className="glass glass-focus group rounded-2xl transition-all p-5 text-left flex flex-col focus:outline-none border-2 border-dashed border-accent/50 hover:border-accent"
            aria-label={t("emp.addNew")}
          >
            <div className="h-12 w-12 rounded-full flex items-center justify-center mb-3 bg-accent text-accent-foreground shadow-md">
              <UserPlus className="h-6 w-6" />
            </div>
            <div className="font-semibold text-primary group-hover:text-accent">{t("emp.addNew")}</div>
            <div className="text-xs text-muted-foreground mt-1">{t("emp.notOnList")}</div>
          </button>

          {filtered.slice(0, visible).map((e) => (
            <Link
              key={e.id}
              to="/order/$employeeId"
              params={{ employeeId: String(e.id) }}
              onClick={() => saveSelectedUser(e, company)}
              className="glass glass-focus group rounded-2xl transition-all p-5 text-left focus:outline-none"
            >
              <div className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold text-primary-foreground mb-3" style={{ background: "var(--gradient-coffee)" }}>
                {e.first_name[0]}{e.last_name[0]}
              </div>
              <div className="font-semibold text-primary group-hover:text-accent">{e.first_name} {e.last_name}</div>
              <div className="text-xs text-muted-foreground truncate">{e.email}</div>
              {e.pin && <div className="text-[11px] mt-1 font-mono text-mocha">PIN: {e.pin}</div>}
            </Link>
          ))}
        </div>

        {filtered.length > visible && (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => setVisible((v) => v + 120)} className="px-8">
              {t("emp.showMore", { count: filtered.length - visible })}
            </Button>
          </div>
        )}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("emp.dialogTitle")}</DialogTitle>
          </DialogHeader>
          <EmployeeFormFields
            form={form}
            errors={errors}
            onChange={updateField}
            companyName={company?.name ?? ""}
            companyDomains={company?.email_domains}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleCreate} disabled={submitting}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

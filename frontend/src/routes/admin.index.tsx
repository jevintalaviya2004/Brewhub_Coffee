import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Coffee, LogOut, Plus, Trash2, Download, ArrowLeft, RefreshCw, Pencil, X, Mail,
} from "lucide-react";
import {
  api,
  type Company, type Product, type User, type Order, type OrderItem, type StatementResult,
} from "@/lib/api";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { LanguageSwitch, errorText, useI18n, validationText } from "@/lib/i18n";
import { FieldError, errorInputClass } from "@/components/FieldError";
import { EmployeeFormFields } from "@/components/EmployeeFormFields";
import {
  allowedEmailDomains,
  backendFieldError,
  checkDateRange,
  checkEmailFormat,
  checkQuantity,
  hasErrors,
  parsePrice,
  validateCompany,
  validateEmployee,
  validateProduct,
  type CompanyField,
  type CompanyForm,
  type EmployeeField,
  type EmployeeForm,
  type ErrorCode,
  type FieldErrors,
  type ProductField,
  type ProductForm,
} from "@/lib/validation";

export const Route = createFileRoute("/admin/")({
  component: AdminPage,
});

function AdminPage() {
  const token = localStorage.getItem("adminToken");
  useEffect(() => { if (!token) window.location.href = "/admin/login"; }, [token]);
  if (!token) return null;
  return <AdminDashboard />;
}

function AdminDashboard() {
  const { t } = useI18n();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  const companiesQuery = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => (await api.getCompanies()).sort((a, b) => a.name.localeCompare(b.name)),
  });

  const productsQuery = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => (await api.getProducts()).sort((a, b) => a.name.localeCompare(b.name)),
  });

  const companies     = companiesQuery.data ?? [];
  const activeCompanyId = selectedCompanyId || String(companies[0]?.id ?? "");

  const usersQuery = useQuery({
    queryKey: ["admin-users", activeCompanyId],
    queryFn:  async () => (activeCompanyId ? api.getUsersByCompany(activeCompanyId) : []),
    enabled:  !!activeCompanyId,
  });

  function signOut() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");
    window.location.href = "/admin/login";
  }

  async function refreshAll() {
    await Promise.all([companiesQuery.refetch(), productsQuery.refetch(), usersQuery.refetch()]);
    toast.success(t("admin.refreshed"));
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/60 bg-card/70 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-primary font-bold">
            <Coffee className="h-6 w-6 text-accent" />
            BrewHub <span className="text-mocha font-normal">/ Admin</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitch />
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-primary shadow-sm hover:bg-accent/10 hover:border-accent hover:text-accent transition-all"
            >
              <ArrowLeft className="h-4 w-4" /> {t("common.backToKiosk")}
            </Link>
            <Button variant="outline" size="sm" onClick={refreshAll}>
              <RefreshCw className="h-4 w-4 mr-1" /> {t("common.refresh")}
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" /> {t("admin.signOut")}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs defaultValue="companies">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="companies">{t("admin.tab.companies")}</TabsTrigger>
            <TabsTrigger value="employees">{t("admin.tab.employees")}</TabsTrigger>
            <TabsTrigger value="products">{t("admin.tab.products")}</TabsTrigger>
            <TabsTrigger value="orders">{t("admin.tab.orders")}</TabsTrigger>
            <TabsTrigger value="export">{t("admin.tab.export")}</TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="mt-6">
            <CompaniesTab companies={companies} refetch={companiesQuery.refetch} />
          </TabsContent>

          <TabsContent value="employees" className="mt-6">
            <EmployeesTab
              companies={companies}
              selectedCompanyId={activeCompanyId}
              setSelectedCompanyId={setSelectedCompanyId}
              employees={usersQuery.data ?? []}
              refetch={usersQuery.refetch}
            />
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <ProductsTab products={productsQuery.data ?? []} refetch={productsQuery.refetch} />
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <OrdersTab />
          </TabsContent>

          <TabsContent value="export" className="mt-6">
            <ExportTab companies={companies} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPANIES TAB — inline edit + delete
// ─────────────────────────────────────────────────────────────────────────────

function CompaniesTab({ companies, refetch }: { companies: Company[]; refetch: () => Promise<unknown> }) {
  const { t } = useI18n();
  const empty: CompanyForm = { name: "", logo_url: "", email_domains: "" };
  const [form, setForm] = useState<CompanyForm>(empty);
  const [errors, setErrors] = useState<FieldErrors<CompanyField>>({});
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  function update(field: CompanyField, value: string) {
    const next = { ...form, [field]: value };
    setForm(next);
    if (tried) setErrors(validateCompany(next));
  }

  async function addCompany() {
    setTried(true);
    const found = validateCompany(form);
    setErrors(found);
    if (hasErrors(found)) return toast.error(t("val.fixErrors"));
    setSaving(true);
    try {
      await api.createCompany({
        name: form.name.trim(),
        logo_url: form.logo_url.trim(),
        email_domains: form.email_domains.trim(),
      });
      setForm(empty); setErrors({}); setTried(false);
      await refetch();
      toast.success(t("admin.company.added"));
    } catch (error) {
      const fieldError = backendFieldError(error, COMPANY_FIELDS);
      if (fieldError) setErrors(fieldError);
      toast.error(errorText(t, error, "admin.company.addFailed"));
    } finally { setSaving(false); }
  }

  async function deleteCompany(id: number) {
    if (!confirm(t("admin.company.confirmDelete"))) return;
    try {
      await api.deleteCompany(id);
      await refetch();
      toast.success(t("admin.company.deleted"));
    } catch (error) {
      toast.error(errorText(t, error, "admin.company.deleteFailed"));
    }
  }

  const addField = (field: CompanyField, label: string, placeholder?: string) => (
    <div>
      <Label>{label}</Label>
      <Input
        value={form[field]}
        placeholder={placeholder}
        onChange={(e) => update(field, e.target.value)}
        aria-invalid={!!errors[field]}
        className={errorInputClass(!!errors[field])}
      />
      <FieldError message={validationText(t, errors[field])} />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-start">
          {addField("name", t("admin.company.name"))}
          {addField("logo_url", t("admin.company.logo"), "/company-logos/thd.jpeg")}
          {addField("email_domains", t("admin.company.domains"), t("admin.company.domainsPlaceholder"))}
          <Button onClick={addCompany} disabled={saving} className="md:mt-6">
            <Plus className="h-4 w-4 mr-1" /> {t("common.add")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("admin.company.domainsHint")}</p>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">{t("common.id")}</th>
              <th className="p-3">{t("common.name")}</th>
              <th className="p-3">{t("admin.company.logo")}</th>
              <th className="p-3">{t("admin.company.domains")}</th>
              <th className="p-3 text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <CompanyRow key={c.id} company={c} refetch={refetch} onDelete={() => deleteCompany(c.id)} />
            ))}
            {companies.length === 0 && <EmptyRow colSpan={5} />}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const COMPANY_FIELDS = ["name", "logo_url", "email_domains"] as const;

/** One editable table row. Saves a field when the user leaves it, if the value is valid. */
function CompanyRow({ company, refetch, onDelete }: {
  company: Company;
  refetch: () => Promise<unknown>;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const saved: CompanyForm = {
    name: company.name,
    logo_url: company.logo_url ?? "",
    email_domains: company.email_domains ?? "",
  };
  const [form, setForm] = useState<CompanyForm>(saved);
  const [errors, setErrors] = useState<FieldErrors<CompanyField>>({});

  async function save(field: CompanyField) {
    if (form[field] === saved[field]) return setErrors((e) => ({ ...e, [field]: undefined }));
    const found = validateCompany(form);
    setErrors(found);
    if (hasErrors(found)) return;
    try {
      await api.updateCompany(company.id, form);
      await refetch();
      toast.success(t("admin.company.updated"));
    } catch (error) {
      const fieldError = backendFieldError(error, COMPANY_FIELDS);
      if (fieldError) setErrors(fieldError);
      toast.error(errorText(t, error, "admin.company.updateFailed"));
    }
  }

  const cell = (field: CompanyField, placeholder?: string) => (
    <td className="p-3 align-top">
      <Input
        value={form[field]}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
        onBlur={() => save(field)}
        aria-invalid={!!errors[field]}
        className={errorInputClass(!!errors[field])}
      />
      <FieldError message={validationText(t, errors[field])} />
    </td>
  );

  return (
    <tr className="border-t border-border/60">
      <td className="p-3 font-mono text-xs align-top pt-5">{company.id}</td>
      {cell("name")}
      {cell("logo_url")}
      {cell("email_domains", t("admin.company.domainsPlaceholder"))}
      <td className="p-3 text-right align-top">
        <Button size="sm" variant="destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEES TAB — add + edit (dialog) + delete
// ─────────────────────────────────────────────────────────────────────────────

function EmployeesTab({
  companies, selectedCompanyId, setSelectedCompanyId, employees, refetch,
}: {
  companies: Company[];
  selectedCompanyId: string;
  setSelectedCompanyId: (id: string) => void;
  employees: User[];
  refetch: () => Promise<unknown>;
}) {
  const { t } = useI18n();
  const empty: EmployeeForm = { first_name: "", last_name: "", email: "", pin: "" };
  const [form, setForm]     = useState<EmployeeForm>(empty);
  const [errors, setErrors] = useState<FieldErrors<EmployeeField>>({});
  const [tried, setTried]   = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm]       = useState<EmployeeForm>(empty);
  const [editErrors, setEditErrors]   = useState<FieldErrors<EmployeeField>>({});
  const [editTried, setEditTried]     = useState(false);
  const [editSaving, setEditSaving]   = useState(false);

  const selectedCompany = useMemo(
    () => companies.find((c) => String(c.id) === String(selectedCompanyId)),
    [companies, selectedCompanyId],
  );
  const domains = selectedCompany?.email_domains;

  function update(field: EmployeeField, value: string) {
    const next = { ...form, [field]: value };
    setForm(next);
    if (tried) setErrors(validateEmployee(next, domains));
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setEditForm({ first_name: user.first_name, last_name: user.last_name, email: user.email, pin: user.pin });
    setEditErrors({});
    setEditTried(false);
  }

  function updateEdit(field: EmployeeField, value: string) {
    const next = { ...editForm, [field]: value };
    setEditForm(next);
    if (editTried) setEditErrors(validateEmployee(next, domains));
  }

  async function saveEdit() {
    if (!editingUser) return;
    setEditTried(true);
    const found = validateEmployee(editForm, domains);
    setEditErrors(found);
    if (hasErrors(found)) return toast.error(t("val.fixErrors"));
    setEditSaving(true);
    try {
      await api.updateUser(editingUser.id, {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        email: editForm.email.trim().toLowerCase(),
        pin: editForm.pin.trim(),
      });
      setEditingUser(null);
      await refetch();
      toast.success(t("admin.emp.updated"));
    } catch (error) {
      const fieldError = backendFieldError(error, EMPLOYEE_FIELDS);
      if (fieldError) setEditErrors(fieldError);
      toast.error(errorText(t, error, "admin.emp.updateFailed"));
    } finally { setEditSaving(false); }
  }

  async function addEmployee() {
    if (!selectedCompanyId) return toast.error(t("admin.emp.required"));
    setTried(true);
    const found = validateEmployee(form, domains);
    setErrors(found);
    if (hasErrors(found)) return toast.error(t("val.fixErrors"));
    setSaving(true);
    try {
      await api.createUser({
        company_id: Number(selectedCompanyId),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        pin: form.pin.trim(),
      });
      setForm(empty); setErrors({}); setTried(false);
      await refetch();
      toast.success(t("admin.emp.added"));
    } catch (error) {
      const fieldError = backendFieldError(error, EMPLOYEE_FIELDS);
      if (fieldError) setErrors(fieldError);
      toast.error(errorText(t, error, "admin.emp.addFailed"));
    } finally { setSaving(false); }
  }

  async function deleteEmployee(id: number) {
    if (!confirm(t("admin.emp.confirmDelete"))) return;
    try {
      await api.deleteUser(id);
      await refetch();
      toast.success(t("admin.emp.deleted"));
    } catch (error) {
      toast.error(errorText(t, error, "admin.emp.deleteFailed"));
    }
  }

  const addField = (field: EmployeeField, label: string, extra: Partial<React.ComponentProps<typeof Input>> = {}) => (
    <div>
      <Label>{label}</Label>
      <Input
        value={form[field]}
        onChange={(e) => update(field, e.target.value)}
        aria-invalid={!!errors[field]}
        className={errorInputClass(!!errors[field])}
        {...extra}
      />
      <FieldError message={validationText(t, errors[field])} />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-start">
          <div>
            <Label>{t("common.company")}</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3"
              value={selectedCompanyId}
              onChange={(e) => { setSelectedCompanyId(e.target.value); setErrors({}); setTried(false); }}
            >
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {addField("first_name", t("common.firstName"))}
          {addField("last_name", t("common.lastName"))}
          {addField("email", t("common.email"), { type: "email" })}
          {addField("pin", t("common.pin"), { inputMode: "numeric", maxLength: 6, placeholder: "1234" })}
          <Button onClick={addEmployee} disabled={saving} className="lg:mt-6">
            <Plus className="h-4 w-4 mr-1" /> {t("common.add")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("val.hint.emailAllowed", { domains: allowedEmailDomains(domains).map((d) => `@${d}`).join(", ") })}
          {" · "}
          {t("val.hint.pin")}
        </p>
      </div>

      <div className="text-sm text-muted-foreground">
        {t("admin.emp.showing", { company: selectedCompany?.name ?? t("admin.emp.selectedCompany") })}
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">{t("common.id")}</th>
              <th className="p-3">{t("common.name")}</th>
              <th className="p-3">{t("common.email")}</th>
              <th className="p-3">{t("common.pin")}</th>
              <th className="p-3 text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-t border-border/60">
                <td className="p-3 font-mono text-xs">{e.id}</td>
                <td className="p-3 font-medium">{e.first_name} {e.last_name}</td>
                <td className="p-3 text-muted-foreground">{e.email}</td>
                <td className="p-3 font-mono text-xs">{e.pin}</td>
                <td className="p-3 text-right flex items-center justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(e)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteEmployee(e.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {employees.length === 0 && <EmptyRow colSpan={5} />}
          </tbody>
        </table>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingUser} onOpenChange={(o) => { if (!o) setEditingUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.emp.editTitle")}</DialogTitle>
          </DialogHeader>
          <EmployeeFormFields
            form={editForm}
            errors={editErrors}
            onChange={updateEdit}
            companyDomains={domains}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>{t("common.cancel")}</Button>
            <Button onClick={saveEdit} disabled={editSaving}>
              {editSaving ? t("admin.emp.saving") : t("admin.emp.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const EMPLOYEE_FIELDS = ["first_name", "last_name", "email", "pin"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS TAB — unchanged
// ─────────────────────────────────────────────────────────────────────────────

function ProductsTab({ products, refetch }: { products: Product[]; refetch: () => Promise<unknown> }) {
  const { t } = useI18n();
  const empty: ProductForm = { name: "", price: "" };
  const [form, setForm]     = useState<ProductForm>(empty);
  const [errors, setErrors] = useState<FieldErrors<ProductField>>({});
  const [tried, setTried]   = useState(false);
  const [saving, setSaving] = useState(false);

  function update(field: ProductField, value: string) {
    const next = { ...form, [field]: value };
    setForm(next);
    if (tried) setErrors(validateProduct(next));
  }

  async function addProduct() {
    setTried(true);
    const found = validateProduct(form);
    setErrors(found);
    if (hasErrors(found)) return toast.error(t("val.fixErrors"));
    setSaving(true);
    try {
      await api.createProduct({ name: form.name.trim(), price: parsePrice(form.price) });
      setForm(empty); setErrors({}); setTried(false);
      await refetch();
      toast.success(t("admin.prod.added"));
    } catch (error) {
      const fieldError = backendFieldError(error, PRODUCT_FIELDS);
      if (fieldError) setErrors(fieldError);
      toast.error(errorText(t, error, "admin.prod.addFailed"));
    } finally { setSaving(false); }
  }

  async function deleteProduct(id: number) {
    if (!confirm(t("admin.prod.confirmDelete"))) return;
    try {
      await api.deleteProduct(id);
      await refetch();
      toast.success(t("admin.prod.deleted"));
    } catch (error) {
      toast.error(errorText(t, error, "admin.prod.deleteFailed"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3 items-start">
        <div>
          <Label>{t("common.name")}</Label>
          <Input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            aria-invalid={!!errors.name}
            className={errorInputClass(!!errors.name)}
          />
          <FieldError message={validationText(t, errors.name)} />
        </div>
        <div>
          <Label>{t("admin.prod.price")}</Label>
          <Input
            inputMode="decimal"
            placeholder="2.50"
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
            aria-invalid={!!errors.price}
            className={errorInputClass(!!errors.price)}
          />
          <FieldError message={validationText(t, errors.price)} />
        </div>
        <Button onClick={addProduct} disabled={saving} className="md:mt-6">
          <Plus className="h-4 w-4 mr-1" /> {t("common.add")}
        </Button>
      </div>

      <div className="overflow-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">{t("common.id")}</th>
              <th className="p-3">{t("common.name")}</th>
              <th className="p-3">{t("admin.prod.price")}</th>
              <th className="p-3 text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <ProductRow key={p.id} product={p} refetch={refetch} onDelete={() => deleteProduct(p.id)} />
            ))}
            {products.length === 0 && <EmptyRow colSpan={4} />}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PRODUCT_FIELDS = ["name", "price"] as const;

function ProductRow({ product, refetch, onDelete }: {
  product: Product;
  refetch: () => Promise<unknown>;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const saved: ProductForm = { name: product.name, price: String(product.price) };
  const [form, setForm] = useState<ProductForm>(saved);
  const [errors, setErrors] = useState<FieldErrors<ProductField>>({});

  async function save(field: ProductField) {
    const unchanged = field === "price"
      ? parsePrice(form.price) === Number(product.price)
      : form.name === saved.name;
    if (unchanged) return setErrors((e) => ({ ...e, [field]: undefined }));
    const found = validateProduct(form);
    setErrors(found);
    if (hasErrors(found)) return;
    try {
      await api.updateProduct(product.id, { name: form.name.trim(), price: parsePrice(form.price) });
      await refetch();
      toast.success(t("admin.prod.updated"));
    } catch (error) {
      const fieldError = backendFieldError(error, PRODUCT_FIELDS);
      if (fieldError) setErrors(fieldError);
      toast.error(errorText(t, error, "admin.prod.updateFailed"));
    }
  }

  const cell = (field: ProductField, extra: Partial<React.ComponentProps<typeof Input>> = {}) => (
    <td className="p-3 align-top">
      <Input
        value={form[field]}
        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
        onBlur={() => save(field)}
        aria-invalid={!!errors[field]}
        className={errorInputClass(!!errors[field])}
        {...extra}
      />
      <FieldError message={validationText(t, errors[field])} />
    </td>
  );

  return (
    <tr className="border-t border-border/60">
      <td className="p-3 font-mono text-xs align-top pt-5">{product.id}</td>
      {cell("name")}
      {cell("price", { inputMode: "decimal" })}
      <td className="p-3 text-right align-top">
        <Button size="sm" variant="destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS TAB — date filter · edit qty · delete item · delete order · cleanup
// ─────────────────────────────────────────────────────────────────────────────

function OrdersTab() {
  const { t } = useI18n();
  const [fromDate, setFromDate] = useState("");
  const [toDate,   setToDate]   = useState("");
  const rangeError = checkDateRange(fromDate, toDate);

  const ordersQuery = useQuery({
    queryKey: ["admin-orders", fromDate, toDate],
    queryFn:  () => api.getOrders(fromDate || undefined, toDate || undefined),
    enabled:  !rangeError,
  });

  const [localQty, setLocalQty] = useState<Record<number, number>>({});
  const [saving,   setSaving]   = useState<Record<number, boolean>>({});

  const orders = ordersQuery.data ?? [];

  function getQty(item: OrderItem) {
    return localQty[item.item_id] ?? item.quantity;
  }

  function getOrderTotal(order: Order) {
    return order.items.reduce((sum, item) => sum + getQty(item) * item.price, 0);
  }

  async function saveItem(item: OrderItem) {
    const newQty = localQty[item.item_id];
    if (newQty === undefined || newQty === item.quantity) return;
    const problem = checkQuantity(newQty);
    if (problem) {
      toast.error(validationText(t, problem));
      setLocalQty((q) => { const n = { ...q }; delete n[item.item_id]; return n; });
      return;
    }
    setSaving((s) => ({ ...s, [item.item_id]: true }));
    try {
      await api.updateOrderItem(item.item_id, newQty);
      setLocalQty((q) => { const n = { ...q }; delete n[item.item_id]; return n; });
      await ordersQuery.refetch();
      toast.success(t("admin.orders.qtySaved"));
    } catch (error) {
      toast.error(errorText(t, error, "admin.orders.saveFailed"));
      setLocalQty((q) => { const n = { ...q }; delete n[item.item_id]; return n; });
    } finally {
      setSaving((s) => ({ ...s, [item.item_id]: false }));
    }
  }

  async function handleDeleteItem(item: OrderItem) {
    if (!confirm(t("admin.orders.confirmRemoveItem", { product: item.product_name }))) return;
    try {
      await api.deleteOrderItem(item.item_id);
      await ordersQuery.refetch();
      toast.success(t("admin.orders.itemRemoved"));
    } catch (error) {
      toast.error(errorText(t, error, "admin.orders.removeFailed"));
    }
  }

  async function handleDeleteOrder(orderId: number) {
    if (!confirm(t("admin.orders.confirmDeleteOrder"))) return;
    try {
      await api.deleteOrder(orderId);
      await ordersQuery.refetch();
      toast.success(t("admin.orders.deleted"));
    } catch (error) {
      toast.error(errorText(t, error, "admin.orders.deleteFailed"));
    }
  }

  async function handleCleanup() {
    if (!confirm(t("admin.orders.confirmCleanup"))) return;
    try {
      const result = await api.cleanupOldOrders();
      await ordersQuery.refetch();
      toast.success(t("admin.orders.cleaned", { count: result.deleted_orders }));
    } catch (error) {
      toast.error(errorText(t, error, "admin.orders.cleanupFailed"));
    }
  }

  type FlatRow = { order: Order; item: OrderItem; isFirst: boolean; isLast: boolean };

  const rows: FlatRow[] = orders.flatMap((order) =>
    order.items.length > 0
      ? order.items.map((item, idx) => ({
          order, item,
          isFirst: idx === 0,
          isLast:  idx === order.items.length - 1,
        }))
      : [{ order, item: { item_id: -order.order_id, product_id: 0, product_name: "—", quantity: 0, price: 0 }, isFirst: true, isLast: true }]
  );

  return (
    <div className="space-y-4">
      {/* Date filter */}
      <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
        <div>
          <Label>{t("common.fromDate")}</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <Label>{t("common.toDate")}</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            aria-invalid={!!rangeError}
            className={errorInputClass(!!rangeError)}
          />
          <FieldError message={validationText(t, rangeError)} />
        </div>
        <Button variant="outline" onClick={() => { setFromDate(""); setToDate(""); }}>
          <X className="h-4 w-4 mr-1" /> {t("common.clear")}
        </Button>
        <Button variant="outline" onClick={() => ordersQuery.refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" /> {t("common.refresh")}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {orders.length === 1 ? t("admin.orders.countOne") : t("admin.orders.countMany", { count: orders.length })}
      </p>

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3 whitespace-nowrap">{t("admin.orders.date")}</th>
              <th className="p-3 whitespace-nowrap">{t("admin.orders.ref")}</th>
              <th className="p-3 whitespace-nowrap">{t("common.name")}</th>
              <th className="p-3 whitespace-nowrap">{t("common.company")}</th>
              <th className="p-3 whitespace-nowrap">{t("admin.orders.product")}</th>
              <th className="p-3 whitespace-nowrap">{t("admin.orders.qty")}</th>
              <th className="p-3 whitespace-nowrap">{t("admin.orders.unit")}</th>
              <th className="p-3 whitespace-nowrap">{t("admin.orders.subtotal")}</th>
              <th className="p-3 whitespace-nowrap">{t("admin.orders.orderTotal")}</th>
              <th className="p-3 whitespace-nowrap text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ order, item, isFirst, isLast }) => {
              const qty       = getQty(item);
              const subtotal  = qty * item.price;
              const orderTotal = getOrderTotal(order);
              const ref  = order.reference_number ? order.reference_number.slice(0, 8) + "…" : "—";
              const date = order.created_at
                ? new Date(order.created_at).toLocaleDateString("de-DE") : "—";

              return (
                <tr
                  key={item.item_id}
                  className={`border-t border-border/60 ${isFirst ? "border-t-2 border-t-border/80" : "border-t-border/30"}`}
                >
                  <td className="p-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                    {isFirst ? date : ""}
                  </td>
                  <td className="p-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {isFirst ? ref : ""}
                  </td>
                  <td className="p-3 font-medium whitespace-nowrap">
                    {isFirst ? order.user_name : ""}
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {isFirst ? order.company_name : ""}
                  </td>
                  <td className="p-3 whitespace-nowrap">{item.product_name}</td>
                  <td className="p-3">
                    {item.item_id > 0 ? (
                      <Input
                        type="number"
                        min={0}
                        value={qty === 0 && localQty[item.item_id] === undefined ? "" : qty}
                        placeholder="0"
                        onChange={(e) =>
                          setLocalQty((q) => ({
                            ...q,
                            [item.item_id]: Math.max(0, parseInt(e.target.value) || 0),
                          }))
                        }
                        onBlur={() => saveItem(item)}
                        disabled={saving[item.item_id]}
                        className="h-8 w-20 text-center"
                      />
                    ) : "—"}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {item.price > 0 ? item.price.toFixed(2) : "—"}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {item.price > 0 ? subtotal.toFixed(2) : "—"}
                  </td>
                  <td className="p-3 font-semibold whitespace-nowrap">
                    {isLast ? <span className="text-primary">€{orderTotal.toFixed(2)}</span> : ""}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {item.item_id > 0 && (
                        <Button
                          size="sm" variant="outline"
                          title={t("admin.orders.removeItem")}
                          onClick={() => handleDeleteItem(item)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {isFirst && (
                        <Button
                          size="sm" variant="destructive"
                          title={t("admin.orders.deleteOrder")}
                          onClick={() => handleDeleteOrder(order.order_id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <EmptyRow colSpan={10} />}
          </tbody>
        </table>
      </div>

      {/* Cleanup */}
      <div className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">{t("admin.orders.cleanupTitle")}</p>
          <p className="text-xs text-muted-foreground">
            {t("admin.orders.cleanupText")}
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={handleCleanup}>
          <Trash2 className="h-4 w-4 mr-1" /> {t("admin.orders.cleanupButton")}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT TAB — date range pickers
// ─────────────────────────────────────────────────────────────────────────────

function ExportTab({ companies }: { companies: Company[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2 items-start">
      <ExcelExportCard />
      <EmailStatementsCard companies={companies} />
    </div>
  );
}

function ExcelExportCard() {
  const { t } = useI18n();
  const [loading,  setLoading]  = useState(false);
  const [file,     setFile]     = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate,   setToDate]   = useState("");
  const rangeError = checkDateRange(fromDate, toDate);

  async function runExport() {
    if (rangeError) return toast.error(validationText(t, rangeError));
    setLoading(true);
    try {
      const result = await api.exportReport(fromDate || undefined, toDate || undefined);
      setFile(result.file);
      toast.success(result ? t("admin.export.downloaded") : t("admin.export.created"));
    } catch (error) {
      toast.error(errorText(t, error, "admin.export.failed"));
    } finally { setLoading(false); }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-primary text-lg flex items-center gap-2">
          <Download className="h-5 w-5" /> {t("admin.export.title")}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("admin.export.calls")} <span className="font-mono">GET /api/export/</span> {t("admin.export.onBackend")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t("common.fromDate")}</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <Label>{t("common.toDate")}</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            aria-invalid={!!rangeError}
            className={errorInputClass(!!rangeError)}
          />
          <FieldError message={validationText(t, rangeError)} />
        </div>
      </div>

      <Button onClick={runExport} disabled={loading} className="w-full">
        {loading ? t("admin.export.exporting") : t("admin.export.download")}
      </Button>
      {file && (
        <p className="text-sm text-mocha">
          {t("admin.export.file")} <span className="font-mono">{file}</span>
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// E-MAIL STATEMENTS — one e-mail with a PDF per employee
// ─────────────────────────────────────────────────────────────────────────────

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("sv-SE");
}

function today() {
  return new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD in local time
}

function EmailStatementsCard({ companies }: { companies: Company[] }) {
  const { t } = useI18n();
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const rangeError = checkDateRange(fromDate, toDate);
  const [testError, setTestError] = useState<ErrorCode | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [testRecipient, setTestRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<StatementResult | null>(null);

  const euro = (value: number) =>
    value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

  async function send() {
    if (rangeError) return toast.error(validationText(t, rangeError));
    const isTest = testRecipient.trim() !== "";
    const testProblem = isTest ? checkEmailFormat(testRecipient) : null;
    setTestError(testProblem);
    if (testProblem) return;
    const question = isTest
      ? t("admin.mail.confirmTest", { email: testRecipient.trim() })
      : t("admin.mail.confirmReal");
    if (!confirm(question)) return;

    setSending(true);
    setResult(null);
    try {
      const res = await api.sendStatements({
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        company_id: companyId ? Number(companyId) : undefined,
        test_recipient: isTest ? testRecipient.trim() : undefined,
      });
      setResult(res);
      if (res.failed.length > 0) toast.error(t("admin.mail.someFailed", { count: res.failed.length }));
      else toast.success(t("admin.mail.done", { count: res.sent.length }));
    } catch (error) {
      toast.error(errorText(t, error, "admin.mail.failed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-primary text-lg flex items-center gap-2">
          <Mail className="h-5 w-5" /> {t("admin.mail.title")}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{t("admin.mail.description")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t("common.fromDate")}</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <Label>{t("common.toDate")}</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            aria-invalid={!!rangeError}
            className={errorInputClass(!!rangeError)}
          />
          <FieldError message={validationText(t, rangeError)} />
        </div>
      </div>

      <div>
        <Label>{t("common.company")}</Label>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3"
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
        >
          <option value="">{t("admin.mail.allCompanies")}</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <Label>{t("admin.mail.testLabel")}</Label>
        <Input
          type="email"
          value={testRecipient}
          onChange={(e) => { setTestRecipient(e.target.value); setTestError(null); }}
          placeholder={t("admin.mail.testPlaceholder")}
          aria-invalid={!!testError}
          className={errorInputClass(!!testError)}
        />
        <FieldError message={validationText(t, testError)} />
        <p className="text-xs text-muted-foreground mt-1">{t("admin.mail.testHint")}</p>
      </div>

      <Button onClick={send} disabled={sending} className="w-full">
        <Mail className="h-4 w-4 mr-1" />
        {sending
          ? t("admin.mail.sending")
          : testRecipient.trim()
            ? t("admin.mail.sendTest")
            : t("admin.mail.sendAll")}
      </Button>

      {result && (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm space-y-2">
          <div className="font-medium text-primary">
            {result.test_mode && <span className="mr-1 rounded bg-accent/20 px-1.5 py-0.5 text-xs">TEST</span>}
            {t("admin.mail.summary", {
              sent: result.sent.length,
              employees: result.employees,
              total: euro(result.total_amount),
            })}
          </div>
          {result.sent.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {result.sent.map((s, i) => (
                <li key={`s${i}`}>✓ {s.name} → {s.email} ({euro(s.amount)})</li>
              ))}
            </ul>
          )}
          {result.skipped.length > 0 && (
            <ul className="text-xs text-mocha space-y-0.5">
              {result.skipped.map((s, i) => (
                <li key={`k${i}`}>– {s.name}: {s.reason}</li>
              ))}
            </ul>
          )}
          {result.failed.length > 0 && (
            <ul className="text-xs text-destructive space-y-0.5">
              {result.failed.map((f, i) => (
                <li key={`f${i}`}>✗ {f.name} ({f.email}): {f.error}</li>
              ))}
            </ul>
          )}
          {result.employees === 0 && <p className="text-xs text-muted-foreground">{t("admin.mail.nothing")}</p>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function EmptyRow({ colSpan }: { colSpan: number }) {
  const { t } = useI18n();
  return (
    <tr>
      <td colSpan={colSpan} className="p-8 text-center text-muted-foreground">{t("common.noData")}</td>
    </tr>
  );
}

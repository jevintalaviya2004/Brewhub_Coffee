import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Coffee, LogOut, Plus, Trash2, Download, ArrowLeft, RefreshCw, Pencil, X,
} from "lucide-react";
import {
  api,
  type Company, type Product, type User, type Order, type OrderItem,
} from "@/lib/api";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { LanguageSwitch, useI18n } from "@/lib/i18n";

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
            <ExportTab />
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
  const [name, setName]     = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function addCompany() {
    if (!name.trim()) return toast.error(t("admin.company.nameRequired"));
    setSaving(true);
    try {
      await api.createCompany({ name: name.trim(), logo_url: logoUrl.trim() });
      setName(""); setLogoUrl("");
      await refetch();
      toast.success(t("admin.company.added"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.company.addFailed"));
    } finally { setSaving(false); }
  }

  async function saveCompany(company: Company, patch: { name: string; logo_url: string }) {
    try {
      await api.updateCompany(company.id, patch);
      await refetch();
      toast.success(t("admin.company.updated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.company.updateFailed"));
    }
  }

  async function deleteCompany(id: number) {
    if (!confirm(t("admin.company.confirmDelete"))) return;
    try {
      await api.deleteCompany(id);
      await refetch();
      toast.success(t("admin.company.deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.company.deleteFailed"));
    }
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <Label>{t("admin.company.name")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>{t("admin.company.logo")}</Label>
          <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
        </div>
        <Button onClick={addCompany} disabled={saving}>
          <Plus className="h-4 w-4 mr-1" /> {t("common.add")}
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">{t("common.id")}</th>
              <th className="p-3">{t("common.name")}</th>
              <th className="p-3">{t("admin.company.logo")}</th>
              <th className="p-3 text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-t border-border/60">
                <td className="p-3 font-mono text-xs">{c.id}</td>
                <td className="p-3">
                  <Input
                    defaultValue={c.name}
                    onBlur={(e) => {
                      if (e.target.value !== c.name)
                        saveCompany(c, { name: e.target.value, logo_url: c.logo_url ?? "" });
                    }}
                  />
                </td>
                <td className="p-3">
                  <Input
                    defaultValue={c.logo_url ?? ""}
                    onBlur={(e) => {
                      if (e.target.value !== (c.logo_url ?? ""))
                        saveCompany(c, { name: c.name, logo_url: e.target.value });
                    }}
                  />
                </td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="destructive" onClick={() => deleteCompany(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {companies.length === 0 && <EmptyRow colSpan={4} />}
          </tbody>
        </table>
      </div>
    </div>
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
  const [form, setForm]   = useState({ first_name: "", last_name: "", email: "", pin: "" });
  const [saving, setSaving] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm]       = useState({ first_name: "", last_name: "", email: "", pin: "" });
  const [editSaving, setEditSaving]   = useState(false);

  const selectedCompany = useMemo(
    () => companies.find((c) => String(c.id) === String(selectedCompanyId)),
    [companies, selectedCompanyId],
  );

  function openEdit(user: User) {
    setEditingUser(user);
    setEditForm({
      first_name: user.first_name,
      last_name:  user.last_name,
      email:      user.email,
      pin:        user.pin,
    });
  }

  async function saveEdit() {
    if (!editingUser) return;
    setEditSaving(true);
    try {
      await api.updateUser(editingUser.id, editForm);
      setEditingUser(null);
      await refetch();
      toast.success(t("admin.emp.updated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.emp.updateFailed"));
    } finally { setEditSaving(false); }
  }

  async function addEmployee() {
    if (!selectedCompanyId || !form.first_name || !form.last_name || !form.email || !form.pin)
      return toast.error(t("admin.emp.required"));
    setSaving(true);
    try {
      await api.createUser({ company_id: Number(selectedCompanyId), ...form });
      setForm({ first_name: "", last_name: "", email: "", pin: "" });
      await refetch();
      toast.success(t("admin.emp.added"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.emp.addFailed"));
    } finally { setSaving(false); }
  }

  async function deleteEmployee(id: number) {
    if (!confirm(t("admin.emp.confirmDelete"))) return;
    try {
      await api.deleteUser(id);
      await refetch();
      toast.success(t("admin.emp.deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.emp.deleteFailed"));
    }
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <div>
          <Label>{t("common.company")}</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3"
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
          >
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><Label>{t("common.firstName")}</Label>
          <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        </div>
        <div><Label>{t("common.lastName")}</Label>
          <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        </div>
        <div><Label>{t("common.email")}</Label>
          <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div><Label>{t("common.pin")}</Label>
          <Input value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} />
        </div>
        <Button onClick={addEmployee} disabled={saving}>
          <Plus className="h-4 w-4 mr-1" /> {t("common.add")}
        </Button>
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
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("common.firstName")}</Label>
                <Input value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
              </div>
              <div>
                <Label>{t("common.lastName")}</Label>
                <Input value={editForm.last_name}  onChange={(e) => setEditForm({ ...editForm, last_name:  e.target.value })} />
              </div>
            </div>
            <div>
              <Label>{t("common.email")}</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div>
              <Label>{t("common.pin")}</Label>
              <Input value={editForm.pin} onChange={(e) => setEditForm({ ...editForm, pin: e.target.value })} />
            </div>
          </div>
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

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS TAB — unchanged
// ─────────────────────────────────────────────────────────────────────────────

function ProductsTab({ products, refetch }: { products: Product[]; refetch: () => Promise<unknown> }) {
  const { t } = useI18n();
  const [form, setForm]   = useState({ name: "", price: "" });
  const [saving, setSaving] = useState(false);

  async function addProduct() {
    const price = Number(form.price);
    if (!form.name || Number.isNaN(price)) return toast.error(t("admin.prod.required"));
    setSaving(true);
    try {
      await api.createProduct({ name: form.name, price });
      setForm({ name: "", price: "" });
      await refetch();
      toast.success(t("admin.prod.added"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.prod.addFailed"));
    } finally { setSaving(false); }
  }

  async function updateProduct(product: Product, patch: Partial<Product>) {
    const updated = { ...product, ...patch };
    try {
      await api.updateProduct(product.id, { name: updated.name, price: Number(updated.price) });
      await refetch();
      toast.success(t("admin.prod.updated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.prod.updateFailed"));
    }
  }

  async function deleteProduct(id: number) {
    if (!confirm(t("admin.prod.confirmDelete"))) return;
    try {
      await api.deleteProduct(id);
      await refetch();
      toast.success(t("admin.prod.deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.prod.deleteFailed"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-1 md:grid-cols-[1fr_160px_auto] gap-3 items-end">
        <div><Label>{t("common.name")}</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div><Label>{t("admin.prod.price")}</Label>
          <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </div>
        <Button onClick={addProduct} disabled={saving}>
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
              <tr key={p.id} className="border-t border-border/60">
                <td className="p-3 font-mono text-xs">{p.id}</td>
                <td className="p-3">
                  <Input defaultValue={p.name}
                    onBlur={(e) => e.target.value !== p.name && updateProduct(p, { name: e.target.value })} />
                </td>
                <td className="p-3">
                  <Input type="number" step="0.01" defaultValue={p.price}
                    onBlur={(e) => Number(e.target.value) !== Number(p.price) && updateProduct(p, { price: Number(e.target.value) })} />
                </td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="destructive" onClick={() => deleteProduct(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {products.length === 0 && <EmptyRow colSpan={4} />}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS TAB — date filter · edit qty · delete item · delete order · cleanup
// ─────────────────────────────────────────────────────────────────────────────

function OrdersTab() {
  const { t } = useI18n();
  const [fromDate, setFromDate] = useState("");
  const [toDate,   setToDate]   = useState("");

  const ordersQuery = useQuery({
    queryKey: ["admin-orders", fromDate, toDate],
    queryFn:  () => api.getOrders(fromDate || undefined, toDate || undefined),
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
    if (newQty < 0) return;
    setSaving((s) => ({ ...s, [item.item_id]: true }));
    try {
      await api.updateOrderItem(item.item_id, newQty);
      setLocalQty((q) => { const n = { ...q }; delete n[item.item_id]; return n; });
      await ordersQuery.refetch();
      toast.success(t("admin.orders.qtySaved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.orders.saveFailed"));
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
      toast.error(error instanceof Error ? error.message : t("admin.orders.removeFailed"));
    }
  }

  async function handleDeleteOrder(orderId: number) {
    if (!confirm(t("admin.orders.confirmDeleteOrder"))) return;
    try {
      await api.deleteOrder(orderId);
      await ordersQuery.refetch();
      toast.success(t("admin.orders.deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.orders.deleteFailed"));
    }
  }

  async function handleCleanup() {
    if (!confirm(t("admin.orders.confirmCleanup"))) return;
    try {
      const result = await api.cleanupOldOrders();
      await ordersQuery.refetch();
      toast.success(t("admin.orders.cleaned", { count: result.deleted_orders }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.orders.cleanupFailed"));
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
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
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

function ExportTab() {
  const { t } = useI18n();
  const [loading,  setLoading]  = useState(false);
  const [file,     setFile]     = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate,   setToDate]   = useState("");

  async function runExport() {
    setLoading(true);
    try {
      const result = await api.exportReport(fromDate || undefined, toDate || undefined);
      setFile(result.file);
      toast.success(result ? t("admin.export.downloaded") : t("admin.export.created"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.export.failed"));
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-xl rounded-xl border border-border bg-card p-6 space-y-4">
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
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
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

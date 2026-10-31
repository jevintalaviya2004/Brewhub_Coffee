import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Minus, Plus, Coffee, ShoppingBag, PartyPopper, Check } from "lucide-react";
import { api, getSelectedUser } from "@/lib/api";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/order/$employeeId")({
  component: OrderPage,
});

// Map product names to a realistic photo
const productLooks: Record<string, { img: string }> = {
  Espresso: { img: "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&w=800&q=70" },
  Cappuccino: { img: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=800&q=70" },
  Americano: { img: "https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=800&q=70" },
  "Latte Macchiato": { img: "https://images.unsplash.com/photo-1561882468-9110e03e0f78?auto=format&fit=crop&w=800&q=70" },
  Latte: { img: "https://images.unsplash.com/photo-1561882468-9110e03e0f78?auto=format&fit=crop&w=800&q=70" },
  Kaffee: { img: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=800&q=70" },
  "Hot Chocolate": { img: "https://images.unsplash.com/photo-1542990253-0b8be07d7074?auto=format&fit=crop&w=800&q=70" },
  Tea: { img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=70" },
  Mocha: { img: "https://images.unsplash.com/photo-1578314675229-a4c4e1ca7d8f?auto=format&fit=crop&w=800&q=70" },
  "Flat White": { img: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=70" },
};
function look(name: string) {
  return productLooks[name] ?? { img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=70" };
}

function OrderPage() {
  const { t } = useI18n();
  const { employeeId } = Route.useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [popKey, setPopKey] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [placedCount, setPlacedCount] = useState(0);

  const { data: employee } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: async () => getSelectedUser(employeeId),
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const products = await api.getProducts();
      return products.sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  function set(id: string, n: number) {
    setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(999, Math.floor(n) || 0)) }));
    setPopKey((k) => ({ ...k, [id]: (k[id] ?? 0) + 1 }));
  }

  const total = (products ?? []).reduce((sum, p) => sum + (qty[p.id] ?? 0) * Number(p.price), 0);
  const itemCount = Object.values(qty).reduce((a, b) => a + b, 0);

  async function handleSave() {
    if (!employee || itemCount === 0) {
      toast.error(t("order.addOne"));
      return;
    }
    setSubmitting(true);
    try {
      await api.createOrder({
        user_id: Number(employee.id),
        items: (products ?? [])
          .filter((p) => (qty[p.id] ?? 0) > 0)
          .map((p) => ({
            product_id: Number(p.id),
            quantity: qty[p.id],
          })),
      });
      setPlacedCount(itemCount);
      setConfirmOpen(false);
      setSuccessOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("order.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  const selectedItems = (products ?? [])
    .filter((p) => (qty[p.id] ?? 0) > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      quantity: qty[p.id],
      subtotal: qty[p.id] * Number(p.price),
    }));

  return (
    <div className="min-h-screen flex flex-col pb-32">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-8 sm:py-12">
        <Link
          to="/employees/$companyId"
          params={{ companyId: String(employee?.company_id ?? "") }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/60 text-sm font-medium text-mocha hover:text-primary hover:border-accent hover:bg-accent/10 transition-all shadow-sm mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> {t("order.backToEmployees")}
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold text-primary flex items-center gap-3">
          <Coffee className="h-8 w-8 text-accent" />
          {t("order.hi", { name: employee?.first_name ?? "" })}
        </h1>
        <p className="text-muted-foreground mt-1">{t("order.pick")}</p>

        <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {(products ?? []).map((p) => {
            const n = qty[p.id] ?? 0;
            const lk = look(p.name);
            return (
              <div key={p.id} className={`glass rounded-2xl overflow-hidden transition-all ${n > 0 ? "ring-2 ring-accent" : ""}`}>
                <div className="relative h-24 sm:h-28 w-full overflow-hidden bg-muted">
                  <img
                    src={lk.img}
                    alt={p.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute top-2 right-2 rounded-full bg-card/90 backdrop-blur px-2.5 py-0.5 text-xs font-semibold text-primary shadow">
                    €{Number(p.price).toFixed(2)}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm sm:text-base text-primary flex items-center gap-1.5 truncate">
                    <Coffee className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </h3>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => set(p.id, n - 1)}
                      disabled={n === 0}
                      aria-label={t("order.decrease")}
                      className="h-11 w-11 rounded-full border-2 hover:bg-accent/10 active:scale-90 transition-transform"
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                    <input
                      type="number"
                      min={0}
                      max={999}
                      value={n === 0 ? "" : n}
                      placeholder="0"
                      onChange={(e) => set(p.id, parseInt(e.target.value) || 0)}
                      className="qty-display h-11 w-14 px-1 rounded-xl text-center text-lg font-bold tabular-nums text-primary bg-card border-2 border-border focus:outline-none focus:border-accent"
                      style={{ appearance: "textfield" }}
                    />
                    <Button
                      size="icon"
                      onClick={() => set(p.id, n + 1)}
                      aria-label={t("order.increase")}
                      className="h-11 w-11 rounded-full active:scale-90 transition-transform"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                  {n > 0 && (
                    <div className="mt-1.5 text-center text-[11px] text-mocha">
                      = <span className="font-semibold text-primary">€{(n * Number(p.price)).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <div className="fixed bottom-0 inset-x-0 glass-strong">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-accent" />
            <div>
              <div className="text-xs text-muted-foreground">{t("order.total", { count: itemCount })}</div>
              <div className="text-xl font-bold text-primary">€{total.toFixed(2)}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate({ to: "/employees/$companyId", params: { companyId: employee?.company_id ?? "" } })}>
              {t("common.back")}
            </Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={submitting || itemCount === 0} className="px-6">
              {t("order.complete")}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(o) => !submitting && setConfirmOpen(o)}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Coffee className="h-5 w-5 text-accent" />
              {t("order.confirmTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("order.confirmText")}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl bg-card/60 border border-border/60 p-4 space-y-2">
            <div className="text-sm text-mocha">
              <span className="font-semibold text-primary">{employee?.first_name} {employee?.last_name}</span>
              {employee?.company?.name && <> · {employee.company.name}</>}
            </div>
            <div className="divide-y divide-border/60">
              {selectedItems.map((it) => (
                <div key={it.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Coffee className="h-4 w-4 text-accent" />
                    <div>
                      <div className="font-medium text-primary">{it.name}</div>
                      <div className="text-xs text-muted-foreground">{it.quantity} × €{it.price.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="font-semibold text-primary">€{it.subtotal.toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <div className="text-sm text-muted-foreground">{itemCount === 1 ? t("order.totalItem") : t("order.totalItems", { count: itemCount })}</div>
              <div className="text-lg font-bold text-primary">€{total.toFixed(2)}</div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              {t("order.keepEditing")}
            </Button>
            <Button onClick={handleSave} disabled={submitting} className="px-6">
              {submitting ? t("order.placing") : t("order.confirmPlace")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="glass-strong text-center">
          <div className="flex flex-col items-center pt-2">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-accent/20 flex items-center justify-center animate-[pulse_1.4s_ease-in-out_infinite]">
                <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center shadow-lg">
                  <Check className="h-8 w-8 text-accent-foreground" strokeWidth={3} />
                </div>
              </div>
              <PartyPopper className="absolute -top-2 -right-2 h-7 w-7 text-accent" />
            </div>
            <DialogTitle className="text-2xl font-bold text-primary mt-4">
              {t("order.placed")}
            </DialogTitle>
            <DialogDescription className="mt-2 text-base">
              {placedCount === 1
                ? t("order.enjoyOne", { name: employee?.first_name ?? "" })
                : t("order.enjoyMany", { count: placedCount, name: employee?.first_name ?? "" })}
            </DialogDescription>
            <div className="mt-3 text-sm text-mocha">
              {t("order.barista")}
            </div>
          </div>
          <DialogFooter className="sm:justify-center mt-2">
            <Button
              onClick={() => { setSuccessOpen(false); navigate({ to: "/" }); }}
              className="px-8"
            >
              {t("order.backHome")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

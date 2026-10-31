const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export type Company = {
  id: number;
  name: string;
  logo_url?: string | null;
};

export type User = {
  id: number;
  company_id: number;
  first_name: string;
  last_name: string;
  email: string;
  pin: string;
};

export type Product = {
  id: number;
  name: string;
  price: number;
};

export type Admin = {
  id: number;
  name?: string;
  email: string;
};

export type AdminLoginResponse = {
  access_token: string;
  admin: Admin;
};

export type OrderItem = {
  item_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
};

export type Order = {
  order_id: number;
  reference_number: string;
  user_id: number;
  user_name: string;
  company_name: string;
  created_at: string;
  total: number;
  items: OrderItem[];
};

// Admin token expired or invalid: clear it and go back to the login page.
function handleUnauthorized(status: number, hadToken: boolean) {
  if (status !== 401 || !hadToken) return;
  localStorage.removeItem("adminToken");
  localStorage.removeItem("admin");
  if (window.location.pathname.startsWith("/admin") && window.location.pathname !== "/admin/login") {
    window.location.href = "/admin/login";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("adminToken");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    handleUnauthorized(response.status, !!token);
    let message = `Request failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      message = errorBody.detail || errorBody.message || message;
    } catch {
      // keep fallback message
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  baseUrl: API_BASE_URL,

  // ── Auth ─────────────────────────────────────────────────────────────
  loginAdmin(email: string, password: string) {
    return request<AdminLoginResponse>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  // ── Companies ────────────────────────────────────────────────────────
  getCompanies() {
    return request<Company[]>("/api/companies/");
  },

  createCompany(company: Pick<Company, "name" | "logo_url">) {
    return request<Company[]>("/api/companies/", {
      method: "POST",
      body: JSON.stringify({ name: company.name, logo_url: company.logo_url ?? "" }),
    });
  },

  updateCompany(companyId: number | string, company: Pick<Company, "name" | "logo_url">) {
    return request<Company[]>(`/api/companies/${companyId}`, {
      method: "PUT",
      body: JSON.stringify({ name: company.name, logo_url: company.logo_url ?? "" }),
    });
  },

  deleteCompany(companyId: number | string) {
    return request<Company[]>(`/api/companies/${companyId}`, { method: "DELETE" });
  },

  // ── Users / Employees ────────────────────────────────────────────────
  getUsersByCompany(companyId: number | string) {
    return request<User[]>(`/api/users/company/${companyId}`);
  },

  createUser(user: Omit<User, "id">) {
    return request<User[]>("/api/users/", {
      method: "POST",
      body: JSON.stringify(user),
    });
  },

  updateUser(userId: number | string, patch: Partial<Omit<User, "id" | "company_id">>) {
    return request<User[]>(`/api/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  },

  deleteUser(userId: number | string) {
    return request<User[]>(`/api/users/${userId}`, { method: "DELETE" });
  },

  // ── Products ─────────────────────────────────────────────────────────
  getProducts() {
    return request<Product[]>("/api/products/");
  },

  createProduct(product: Pick<Product, "name" | "price">) {
    return request<Product[]>("/api/products/", {
      method: "POST",
      body: JSON.stringify(product),
    });
  },

  updateProduct(productId: number | string, product: Pick<Product, "name" | "price">) {
    return request<Product[]>(`/api/products/${productId}`, {
      method: "PUT",
      body: JSON.stringify(product),
    });
  },

  deleteProduct(productId: number | string) {
    return request<Product[]>(`/api/products/${productId}`, { method: "DELETE" });
  },

  // ── Orders ───────────────────────────────────────────────────────────
  createOrder(order: { user_id: number; items: Array<{ product_id: number; quantity: number }> }) {
    return request<{ message: string; order_id: number; total: number }>("/api/orders/", {
      method: "POST",
      body: JSON.stringify(order),
    });
  },

  getOrders(fromDate?: string, toDate?: string) {
    const params = new URLSearchParams();
    if (fromDate) params.append("from_date", fromDate);
    if (toDate)   params.append("to_date",   toDate);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<Order[]>(`/api/orders/${qs}`);
  },

  updateOrderItem(itemId: number, quantity: number) {
    return request<{ item_id: number; quantity: number; order_id: number; order_total: number }>(
      `/api/orders/items/${itemId}`,
      { method: "PUT", body: JSON.stringify({ quantity }) },
    );
  },

  deleteOrderItem(itemId: number) {
    return request<{ deleted_item_id: number; order_id: number; new_order_total: number }>(
      `/api/orders/items/${itemId}`,
      { method: "DELETE" },
    );
  },

  deleteOrder(orderId: number) {
    return request<{ deleted_order_id: number }>(`/api/orders/${orderId}`, { method: "DELETE" });
  },

  cleanupOldOrders() {
    return request<{ deleted_orders: number }>("/api/orders/cleanup", { method: "DELETE" });
  },

  // ── Export ───────────────────────────────────────────────────────────
  async exportReport(fromDate?: string, toDate?: string) {
    const token = localStorage.getItem("adminToken");
    const params = new URLSearchParams();
    if (fromDate) params.append("from_date", fromDate);
    if (toDate)   params.append("to_date",   toDate);
    const qs = params.toString() ? `?${params.toString()}` : "";

    const response = await fetch(`${API_BASE_URL}/api/export/${qs}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      handleUnauthorized(response.status, !!token);
      let message = `Request failed with status ${response.status}`;
      try {
        const errorBody = await response.json();
        message = errorBody.detail || errorBody.message || message;
      } catch { /* keep fallback */ }
      throw new Error(message);
    }
    const blob = await response.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "coffee_report.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { message: "Export downloaded successfully", file: "coffee_report.xlsx" };
  },
};

export function saveSelectedUser(user: User, company?: Company | null) {
  sessionStorage.setItem("selectedUser", JSON.stringify({ ...user, company }));
}

export function getSelectedUser(userId: string) {
  const saved = sessionStorage.getItem("selectedUser");
  if (!saved) return null;
  try {
    const user = JSON.parse(saved) as User & { company?: Company | null };
    return String(user.id) === String(userId) ? user : null;
  } catch {
    return null;
  }
}

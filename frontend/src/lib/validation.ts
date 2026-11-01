// Input rules for BrewHub. The backend checks the same rules in Backend/app/validation.py.
// Each function returns null (= valid) or an error code. The UI translates the code with
// t(`val.${code}`), see src/lib/i18n.tsx.

export type ErrorCode =
  | "required"
  | "name_too_short"
  | "name_too_long"
  | "name_has_digits"
  | "name_invalid_chars"
  | "email_invalid"
  | "email_domain_not_allowed"
  | "gmail_invalid_chars"
  | "gmail_length"
  | "email_taken"
  | "pin_invalid"
  | "pin_taken"
  | "company_name_too_short"
  | "company_name_too_long"
  | "company_name_taken"
  | "logo_invalid"
  | "domain_invalid"
  | "product_name_too_short"
  | "product_name_too_long"
  | "product_name_taken"
  | "price_invalid"
  | "price_decimals"
  | "price_range"
  | "quantity_invalid"
  | "quantity_range"
  | "date_order";

export type FieldErrors<K extends string = string> = Partial<Record<K, ErrorCode>>;

const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿĀ-žẞß][A-Za-zÀ-ÖØ-öø-ÿĀ-žẞß' -]*$/;
const EMAIL_RE = /^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
const GMAIL_LOCAL_RE = /^[a-z0-9](?:[a-z0-9.]*[a-z0-9])?$/;
const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
const PIN_RE = /^\d{4,6}$/;
const GMAIL_DOMAINS = ["gmail.com", "googlemail.com"];

export const MIN_PRICE = 0.1;
export const MAX_PRICE = 20;
export const MAX_QUANTITY = 20;

const collapse = (value: string) => value.replace(/\s+/g, " ").trim();

export function checkName(value: string): ErrorCode | null {
  const text = collapse(value);
  if (!text) return "required";
  if (text.length < 2) return "name_too_short";
  if (text.length > 50) return "name_too_long";
  if (/\d/.test(text)) return "name_has_digits";
  if (!NAME_RE.test(text)) return "name_invalid_chars";
  return null;
}

/** "th-deg.de, @stud.th-deg.de" -> ["th-deg.de", "stud.th-deg.de"] */
export function parseDomains(value: string | null | undefined): string[] {
  const result: string[] = [];
  for (const part of (value ?? "").toLowerCase().split(/[,\s;]+/)) {
    const domain = part.trim().replace(/^@+/, "");
    if (domain && !result.includes(domain)) result.push(domain);
  }
  return result;
}

export function checkDomains(value: string): ErrorCode | null {
  return parseDomains(value).every((d) => DOMAIN_RE.test(d)) ? null : "domain_invalid";
}

export function allowedEmailDomains(companyDomains: string | null | undefined): string[] {
  return [...GMAIL_DOMAINS.slice(0, 1), ...parseDomains(companyDomains)];
}

export function checkEmail(value: string, companyDomains?: string | null): ErrorCode | null {
  const email = value.trim().toLowerCase();
  if (!email) return "required";
  if (email.length > 254 || email.split("@").length !== 2 || email.includes("..") || !EMAIL_RE.test(email)) {
    return "email_invalid";
  }
  const [local, domain] = email.split("@");
  const allowed = [...GMAIL_DOMAINS, ...parseDomains(companyDomains)];
  if (!allowed.includes(domain)) return "email_domain_not_allowed";
  if (GMAIL_DOMAINS.includes(domain)) {
    const base = local.split("+")[0];
    if (!GMAIL_LOCAL_RE.test(base)) return "gmail_invalid_chars";
    const length = base.replace(/\./g, "").length;
    if (length < 6 || length > 30) return "gmail_length";
  }
  return null;
}

/** Simple format check only (admin login, test address). */
export function checkEmailFormat(value: string): ErrorCode | null {
  const email = value.trim().toLowerCase();
  if (!email) return "required";
  return EMAIL_RE.test(email) && !email.includes("..") ? null : "email_invalid";
}

export function checkPin(value: string): ErrorCode | null {
  const pin = value.trim();
  if (!pin) return "required";
  return PIN_RE.test(pin) ? null : "pin_invalid";
}

export function checkCompanyName(value: string): ErrorCode | null {
  const name = collapse(value);
  if (!name) return "required";
  if (name.length < 2) return "company_name_too_short";
  if (name.length > 60) return "company_name_too_long";
  return null;
}

export function checkLogoUrl(value: string): ErrorCode | null {
  const url = value.trim();
  if (!url) return null;
  if (/\s/.test(url) || url.length > 500) return "logo_invalid";
  return url.startsWith("https://") || url.startsWith("/company-logos/") ? null : "logo_invalid";
}

export function checkProductName(value: string): ErrorCode | null {
  const name = collapse(value);
  if (!name) return "required";
  if (name.length < 2) return "product_name_too_short";
  if (name.length > 40) return "product_name_too_long";
  return null;
}

export function checkPrice(value: string | number): ErrorCode | null {
  const text = String(value).trim().replace(",", ".");
  if (!text) return "required";
  if (!/^\d+(\.\d+)?$/.test(text)) return "price_invalid";
  if (/\.\d{3,}$/.test(text)) return "price_decimals";
  const price = Number(text);
  if (price < MIN_PRICE || price > MAX_PRICE) return "price_range";
  return null;
}

export function parsePrice(value: string | number): number {
  return Number(String(value).trim().replace(",", "."));
}

export function checkQuantity(value: number): ErrorCode | null {
  if (!Number.isInteger(value)) return "quantity_invalid";
  return value < 1 || value > MAX_QUANTITY ? "quantity_range" : null;
}

export function checkDateRange(from: string, to: string): ErrorCode | null {
  return from && to && from > to ? "date_order" : null;
}

/** Keeps only the fields that have an error. */
export function collectErrors<K extends string>(checks: Record<K, ErrorCode | null>): FieldErrors<K> {
  const errors: FieldErrors<K> = {};
  for (const key of Object.keys(checks) as K[]) {
    const code = checks[key];
    if (code) errors[key] = code;
  }
  return errors;
}

export const hasErrors = (errors: FieldErrors) => Object.keys(errors).length > 0;

// ── Form helpers ─────────────────────────────────────────────────────────────

export type EmployeeForm = { first_name: string; last_name: string; email: string; pin: string };
export type EmployeeField = keyof EmployeeForm;

export function validateEmployee(form: EmployeeForm, companyDomains?: string | null): FieldErrors<EmployeeField> {
  return collectErrors<EmployeeField>({
    first_name: checkName(form.first_name),
    last_name: checkName(form.last_name),
    email: checkEmail(form.email, companyDomains),
    pin: checkPin(form.pin),
  });
}

export type CompanyForm = { name: string; logo_url: string; email_domains: string };
export type CompanyField = keyof CompanyForm;

export function validateCompany(form: CompanyForm): FieldErrors<CompanyField> {
  return collectErrors<CompanyField>({
    name: checkCompanyName(form.name),
    logo_url: checkLogoUrl(form.logo_url),
    email_domains: checkDomains(form.email_domains),
  });
}

export type ProductForm = { name: string; price: string };
export type ProductField = keyof ProductForm;

export function validateProduct(form: ProductForm): FieldErrors<ProductField> {
  return collectErrors<ProductField>({
    name: checkProductName(form.name),
    price: checkPrice(form.price),
  });
}

/** Maps a backend error ({ field, code }) to a form field, if the field belongs to the form. */
export function backendFieldError<K extends string>(
  error: unknown,
  fields: readonly K[],
): FieldErrors<K> | null {
  const e = error as { field?: string; code?: string } | null;
  if (e?.field && e.code && (fields as readonly string[]).includes(e.field)) {
    return { [e.field]: e.code } as FieldErrors<K>;
  }
  return null;
}

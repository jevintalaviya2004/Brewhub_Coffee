import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, errorInputClass } from "@/components/FieldError";
import { useI18n, validationText } from "@/lib/i18n";
import { allowedEmailDomains, type EmployeeField, type EmployeeForm, type FieldErrors } from "@/lib/validation";

type Props = {
  form: EmployeeForm;
  errors: FieldErrors<EmployeeField>;
  onChange: (field: EmployeeField, value: string) => void;
  companyName?: string;
  companyDomains?: string | null;
};

/** First name, last name, (company), e-mail and PIN with inline error messages. */
export function EmployeeFormFields({ form, errors, onChange, companyName, companyDomains }: Props) {
  const { t } = useI18n();
  const domains = allowedEmailDomains(companyDomains).map((d) => `@${d}`).join(", ");

  const field = (name: EmployeeField, label: string, extra: Partial<React.ComponentProps<typeof Input>> = {}) => (
    <div>
      <Label htmlFor={`emp-${name}`}>{label}</Label>
      <Input
        id={`emp-${name}`}
        value={form[name]}
        onChange={(e) => onChange(name, e.target.value)}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `emp-${name}-error` : undefined}
        className={errorInputClass(!!errors[name])}
        {...extra}
      />
      <FieldError id={`emp-${name}-error`} message={validationText(t, errors[name])} />
    </div>
  );

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        {field("first_name", t("common.firstName"), { autoComplete: "given-name" })}
        {field("last_name", t("common.lastName"), { autoComplete: "family-name" })}
      </div>
      {companyName !== undefined && (
        <div>
          <Label>{t("common.company")}</Label>
          <Input value={companyName} disabled />
        </div>
      )}
      <div>
        {field("email", t("common.email"), { type: "email", autoComplete: "email", inputMode: "email" })}
        {!errors.email && <p className="mt-1 text-xs text-muted-foreground">{t("val.hint.emailAllowed", { domains })}</p>}
      </div>
      <div>
        {field("pin", t("common.pin"), {
          inputMode: "numeric",
          maxLength: 6,
          placeholder: t("emp.pinPlaceholder"),
        })}
        {!errors.pin && <p className="mt-1 text-xs text-muted-foreground">{t("val.hint.pin")}</p>}
      </div>
    </div>
  );
}

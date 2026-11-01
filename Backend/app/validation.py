"""Input rules for BrewHub.

Every rule raises ValidationProblem(field, code). The frontend has the same
rules in src/lib/validation.ts and shows a translated message for each code.
"""

import re
from decimal import Decimal, InvalidOperation
from typing import Iterable, List, Optional


class ValidationProblem(Exception):
    def __init__(self, field: str, code: str, status: int = 400):
        super().__init__(f"{field}: {code}")
        self.field = field
        self.code = code
        self.status = status


# Letters (incl. umlauts and accents), spaces, hyphen, apostrophe. Must start with a letter.
NAME_RE = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿĀ-žẞß][A-Za-zÀ-ÖØ-öø-ÿĀ-žẞß' \-]*$")
EMAIL_RE = re.compile(r"^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$")
GMAIL_LOCAL_RE = re.compile(r"^[a-z0-9](?:[a-z0-9.]*[a-z0-9])?$")
DOMAIN_RE = re.compile(r"^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$")
PIN_RE = re.compile(r"^\d{4,6}$")

GMAIL_DOMAINS = {"gmail.com", "googlemail.com"}
MIN_PRICE = Decimal("0.10")
MAX_PRICE = Decimal("20.00")
MAX_QUANTITY = 20


def clean_name(value: Optional[str], field: str) -> str:
    text = re.sub(r"\s+", " ", (value or "")).strip()
    if not text:
        raise ValidationProblem(field, "required")
    if len(text) < 2:
        raise ValidationProblem(field, "name_too_short")
    if len(text) > 50:
        raise ValidationProblem(field, "name_too_long")
    if any(ch.isdigit() for ch in text):
        raise ValidationProblem(field, "name_has_digits")
    if not NAME_RE.match(text):
        raise ValidationProblem(field, "name_invalid_chars")
    return text


def parse_domains(value: Optional[str]) -> List[str]:
    """'th-deg.de, @stud.th-deg.de' -> ['th-deg.de', 'stud.th-deg.de']"""
    domains = []
    for part in re.split(r"[,\s;]+", (value or "").lower()):
        part = part.strip().lstrip("@")
        if part and part not in domains:
            domains.append(part)
    return domains


def clean_domains(value: Optional[str]) -> str:
    domains = parse_domains(value)
    for domain in domains:
        if not DOMAIN_RE.match(domain):
            raise ValidationProblem("email_domains", "domain_invalid")
    return ", ".join(domains)


def clean_email(value: Optional[str], company_domains: Iterable[str] = ()) -> str:
    email = (value or "").strip().lower()
    if not email:
        raise ValidationProblem("email", "required")
    if len(email) > 254 or email.count("@") != 1 or ".." in email or not EMAIL_RE.match(email):
        raise ValidationProblem("email", "email_invalid")

    local, domain = email.split("@")
    allowed = set(GMAIL_DOMAINS) | {d.lower() for d in company_domains}
    if domain not in allowed:
        raise ValidationProblem("email", "email_domain_not_allowed")

    if domain in GMAIL_DOMAINS:
        base = local.split("+", 1)[0]          # name+tag@gmail.com is allowed
        if not GMAIL_LOCAL_RE.match(base):
            raise ValidationProblem("email", "gmail_invalid_chars")
        if not 6 <= len(base.replace(".", "")) <= 30:
            raise ValidationProblem("email", "gmail_length")
    return email


def clean_pin(value: Optional[str]) -> str:
    pin = (value or "").strip()
    if not pin:
        raise ValidationProblem("pin", "required")
    if not PIN_RE.match(pin):
        raise ValidationProblem("pin", "pin_invalid")
    return pin


def clean_company_name(value: Optional[str]) -> str:
    name = re.sub(r"\s+", " ", (value or "")).strip()
    if not name:
        raise ValidationProblem("name", "required")
    if len(name) < 2:
        raise ValidationProblem("name", "company_name_too_short")
    if len(name) > 60:
        raise ValidationProblem("name", "company_name_too_long")
    return name


def clean_logo_url(value: Optional[str]) -> str:
    url = (value or "").strip()
    if not url:
        return ""
    if " " in url or len(url) > 500:
        raise ValidationProblem("logo_url", "logo_invalid")
    if not (url.startswith("https://") or url.startswith("/company-logos/")):
        raise ValidationProblem("logo_url", "logo_invalid")
    return url


def clean_product_name(value: Optional[str]) -> str:
    name = re.sub(r"\s+", " ", (value or "")).strip()
    if not name:
        raise ValidationProblem("name", "required")
    if len(name) < 2:
        raise ValidationProblem("name", "product_name_too_short")
    if len(name) > 40:
        raise ValidationProblem("name", "product_name_too_long")
    return name


def clean_price(value) -> float:
    try:
        price = Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise ValidationProblem("price", "price_invalid")
    if not price.is_finite():
        raise ValidationProblem("price", "price_invalid")
    if price.as_tuple().exponent < -2:
        raise ValidationProblem("price", "price_decimals")
    if price < MIN_PRICE or price > MAX_PRICE:
        raise ValidationProblem("price", "price_range")
    return float(price)


def clean_quantity(value, allow_zero: bool = False) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValidationProblem("quantity", "quantity_invalid")
    lowest = 0 if allow_zero else 1
    if value < lowest or value > MAX_QUANTITY:
        raise ValidationProblem("quantity", "quantity_range")
    return value

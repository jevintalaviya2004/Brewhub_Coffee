"""Collects each employee's orders and e-mails them a PDF statement."""

from datetime import date, datetime, timedelta
from typing import Callable, Dict, List, Optional

from email_validator import EmailNotValidError, validate_email

from app import config
from app.database import supabase
from app.services.mailer import Mailer, SmtpSettings, build_statement_email
from app.services.statement_pdf import Statement, StatementLine, build_statement_pdf, period_text

PAGE_SIZE = 1000   # Supabase returns at most 1000 rows per request
ID_CHUNK = 200     # keep 'in (...)' filters short
TEST_MODE_LIMIT = 3


def smtp_settings() -> SmtpSettings:
    return SmtpSettings(
        host=config.SMTP_HOST,
        port=config.SMTP_PORT,
        user=config.SMTP_USER,
        password=config.SMTP_PASSWORD,
        sender=config.SMTP_FROM,
        sender_name=config.SMTP_FROM_NAME,
    )


def _fetch_all(build_query: Callable) -> List[dict]:
    """Reads all rows of a query, page by page."""
    rows: List[dict] = []
    start = 0
    while True:
        page = build_query().range(start, start + PAGE_SIZE - 1).execute().data or []
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            return rows
        start += PAGE_SIZE


def _fetch_in(table: str, column: str, ids: List, columns: str = "*") -> List[dict]:
    rows: List[dict] = []
    unique = list(dict.fromkeys(ids))
    for i in range(0, len(unique), ID_CHUNK):
        chunk = unique[i : i + ID_CHUNK]
        rows.extend(_fetch_all(lambda chunk=chunk: supabase.table(table).select(columns).in_(column, chunk)))
    return rows


def _parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def load_statements(
    from_date: Optional[date],
    to_date: Optional[date],
    company_id: Optional[int] = None,
) -> List[Statement]:
    """One Statement per employee who ordered something in the period."""

    def orders_query():
        query = supabase.table("orders").select("id, reference_number, user_id, created_at")
        if from_date:
            query = query.gte("created_at", from_date.isoformat())
        if to_date:
            query = query.lt("created_at", (to_date + timedelta(days=1)).isoformat())
        return query.order("id")

    orders = _fetch_all(orders_query)
    if not orders:
        return []

    users = {u["id"]: u for u in _fetch_in("users", "id", [o["user_id"] for o in orders])}
    if company_id is not None:
        users = {uid: u for uid, u in users.items() if u.get("company_id") == company_id}
        orders = [o for o in orders if o["user_id"] in users]
        if not orders:
            return []

    companies = {
        c["id"]: c
        for c in _fetch_in("companies", "id", [u["company_id"] for u in users.values() if u.get("company_id")])
    }
    items = _fetch_in("order_items", "order_id", [o["id"] for o in orders])
    products = {p["id"]: p for p in _fetch_in("products", "id", [i["product_id"] for i in items if i.get("product_id")])}

    items_by_order: Dict[int, List[dict]] = {}
    for item in items:
        items_by_order.setdefault(item["order_id"], []).append(item)

    statements: Dict[int, Statement] = {}
    for order in orders:
        user = users.get(order["user_id"])
        if not user:
            continue  # employee was deleted
        statement = statements.get(user["id"])
        if statement is None:
            company = companies.get(user.get("company_id"), {})
            statement = Statement(
                employee_name=f'{user.get("first_name", "")} {user.get("last_name", "")}'.strip(),
                employee_email=(user.get("email") or "").strip(),
                employee_pin=str(user.get("pin") or ""),
                company_name=company.get("name", "–"),
                from_date=from_date,
                to_date=to_date,
            )
            statements[user["id"]] = statement

        ordered_at = _parse_time(order["created_at"])
        for item in items_by_order.get(order["id"], []):
            product = products.get(item.get("product_id"), {})
            statement.lines.append(
                StatementLine(
                    ordered_at=ordered_at,
                    reference=str(order.get("reference_number") or order["id"]),
                    product=product.get("name", "Gelöschtes Getränk"),
                    quantity=int(item["quantity"]),
                    unit_price=float(item["price"]),
                )
            )

    return sorted(statements.values(), key=lambda s: (s.company_name, s.employee_name))


def _valid_email(address: str) -> Optional[str]:
    try:
        return validate_email(address, check_deliverability=False).normalized
    except EmailNotValidError:
        return None


def send_statements(
    from_date: Optional[date],
    to_date: Optional[date],
    company_id: Optional[int] = None,
    test_recipient: Optional[str] = None,
    mailer_factory: Callable[[SmtpSettings], Mailer] = Mailer,
) -> dict:
    settings = smtp_settings()
    if not settings.is_configured:
        raise RuntimeError(
            "SMTP is not configured. Set SMTP_USER and SMTP_PASSWORD (and optionally SMTP_HOST, SMTP_PORT, SMTP_FROM)."
        )

    test_address = None
    if test_recipient:
        test_address = _valid_email(test_recipient.strip())
        if not test_address:
            raise ValueError("The test e-mail address is not valid.")

    statements = [s for s in load_statements(from_date, to_date, company_id) if s.total > 0]

    result = {
        "period": period_text(from_date, to_date),
        "test_mode": bool(test_address),
        "employees": len(statements),
        "total_amount": round(sum(s.total for s in statements), 2),
        "sent": [],
        "skipped": [],
        "failed": [],
    }

    to_send = []
    for statement in statements:
        address = _valid_email(statement.employee_email)
        if not address and not test_address:
            result["skipped"].append({"name": statement.employee_name, "reason": "no valid e-mail address"})
            continue
        to_send.append((statement, address))

    if test_address:
        for statement, _ in to_send[TEST_MODE_LIMIT:]:
            result["skipped"].append({"name": statement.employee_name, "reason": f"test mode: only {TEST_MODE_LIMIT} e-mails"})
        to_send = to_send[:TEST_MODE_LIMIT]

    if not to_send:
        return result

    with mailer_factory(settings) as mailer:
        for statement, address in to_send:
            recipient = test_address or address
            try:
                pdf = build_statement_pdf(statement)
                message = build_statement_email(settings, statement, pdf, recipient, test_mode=bool(test_address))
                mailer.send(message)
                result["sent"].append({"name": statement.employee_name, "email": recipient, "amount": statement.total})
            except Exception as error:  # one failed e-mail must not stop the others
                result["failed"].append({"name": statement.employee_name, "email": recipient, "error": str(error)})

    return result

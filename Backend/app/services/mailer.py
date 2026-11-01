"""Sends e-mails through an SMTP server (for example Gmail)."""

import html as html_lib
import re
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from typing import Optional

from app.services.statement_pdf import Statement, euro, period_text


@dataclass
class SmtpSettings:
    host: str
    port: int
    user: str
    password: str
    sender: str
    sender_name: str = "BrewHub"
    timeout: int = 20

    @property
    def is_configured(self) -> bool:
        return bool(self.host and self.port and self.user and self.password and self.sender)


class Mailer:
    """Keeps ONE connection open for many e-mails. Use it with 'with'."""

    def __init__(self, settings: SmtpSettings):
        self.settings = settings
        self._smtp: Optional[smtplib.SMTP] = None

    def __enter__(self) -> "Mailer":
        s = self.settings
        context = ssl.create_default_context()
        if s.port == 465:
            self._smtp = smtplib.SMTP_SSL(s.host, s.port, timeout=s.timeout, context=context)
        else:
            self._smtp = smtplib.SMTP(s.host, s.port, timeout=s.timeout)
            self._smtp.ehlo()
            self._smtp.starttls(context=context)
            self._smtp.ehlo()
        self._smtp.login(s.user, s.password)
        return self

    def __exit__(self, *exc) -> None:
        if self._smtp is not None:
            try:
                self._smtp.quit()
            except smtplib.SMTPException:
                pass
            self._smtp = None

    def send(self, message: EmailMessage) -> None:
        if self._smtp is None:
            raise RuntimeError("Mailer is not connected. Use 'with Mailer(...) as mailer'.")
        self._smtp.send_message(message)


def _safe_filename(text: str) -> str:
    replacements = {"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss", "Ä": "Ae", "Ö": "Oe", "Ü": "Ue"}
    for old, new in replacements.items():
        text = text.replace(old, new)
    return re.sub(r"[^A-Za-z0-9_-]+", "-", text).strip("-") or "mitarbeiter"


def build_statement_email(
    settings: SmtpSettings,
    statement: Statement,
    pdf_bytes: bytes,
    recipient: str,
    test_mode: bool = False,
) -> EmailMessage:
    period = period_text(statement.from_date, statement.to_date)
    first_name = statement.employee_name.split(" ")[0]
    amount = euro(statement.total)

    subject = f"Deine Kaffee-Abrechnung ({period}): {amount}"
    if test_mode:
        subject = f"[TEST für {statement.employee_name}] {subject}"

    text = (
        f"Hallo {first_name},\n\n"
        f"hier ist deine Kaffee-Abrechnung von BrewHub.\n\n"
        f"Firma:          {statement.company_name}\n"
        f"Zeitraum:       {period}\n"
        f"Bestellungen:   {statement.order_count}\n"
        f"Getränke:       {statement.drink_count}\n"
        f"Offener Betrag: {amount}\n\n"
        f"Alle Bestellungen mit Datum und Uhrzeit findest du im PDF im Anhang.\n\n"
        f"Viele Grüße\nBrewHub\n"
    )
    company = html_lib.escape(statement.company_name)
    greeting_name = html_lib.escape(first_name)
    html = f"""\
<html><body style="font-family:Arial,Helvetica,sans-serif;color:#3b2417">
  <h2 style="color:#4a2c1d;margin-bottom:4px">BrewHub – Kaffee-Abrechnung</h2>
  <p>Hallo {greeting_name},</p>
  <p>hier ist deine Kaffee-Abrechnung.</p>
  <table cellpadding="4" style="border-collapse:collapse">
    <tr><td><b>Firma</b></td><td>{company}</td></tr>
    <tr><td><b>Zeitraum</b></td><td>{period}</td></tr>
    <tr><td><b>Bestellungen</b></td><td>{statement.order_count}</td></tr>
    <tr><td><b>Getränke</b></td><td>{statement.drink_count}</td></tr>
    <tr><td><b>Offener Betrag</b></td><td style="font-size:18px;color:#4a2c1d"><b>{amount}</b></td></tr>
  </table>
  <p>Alle Bestellungen mit Datum und Uhrzeit findest du im PDF im Anhang.</p>
  <p>Viele Grüße<br>BrewHub</p>
</body></html>"""

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((settings.sender_name, settings.sender))
    message["To"] = recipient
    message["Message-ID"] = make_msgid(domain=settings.sender.split("@")[-1] or None)
    message.set_content(text)
    message.add_alternative(html, subtype="html")

    end = statement.to_date.isoformat() if statement.to_date else "aktuell"
    filename = f"BrewHub-Abrechnung_{end}_{_safe_filename(statement.employee_name)}.pdf"
    message.add_attachment(pdf_bytes, maintype="application", subtype="pdf", filename=filename)
    return message

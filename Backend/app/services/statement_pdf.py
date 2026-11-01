"""Builds the monthly coffee statement (PDF) for one employee.

This module has no database or network code, so it is easy to test.
"""

from dataclasses import dataclass, field
from datetime import date, datetime
from io import BytesIO
from typing import List, Optional
from zoneinfo import ZoneInfo

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

LOCAL_TZ = ZoneInfo("Europe/Berlin")

COFFEE = colors.HexColor("#4a2c1d")
CREAM = colors.HexColor("#f5ebe0")
LINE = colors.HexColor("#d6c3b0")


@dataclass
class StatementLine:
    ordered_at: datetime          # timezone-aware (UTC from the database)
    reference: str                # order reference number
    product: str
    quantity: int
    unit_price: float

    @property
    def subtotal(self) -> float:
        return round(self.quantity * self.unit_price, 2)


@dataclass
class Statement:
    employee_name: str
    employee_email: str
    employee_pin: str
    company_name: str
    from_date: Optional[date]
    to_date: Optional[date]
    lines: List[StatementLine] = field(default_factory=list)

    @property
    def total(self) -> float:
        return round(sum(line.subtotal for line in self.lines), 2)

    @property
    def drink_count(self) -> int:
        return sum(line.quantity for line in self.lines)

    @property
    def order_count(self) -> int:
        return len({line.reference for line in self.lines})


def euro(value: float) -> str:
    """German money format: 1234.5 -> '1.234,50 €'."""
    text = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{text} €"


def local_time(value: datetime) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=ZoneInfo("UTC"))
    return value.astimezone(LOCAL_TZ)


def period_text(from_date: Optional[date], to_date: Optional[date]) -> str:
    def fmt(d: date) -> str:
        return d.strftime("%d.%m.%Y")

    if from_date and to_date:
        return f"{fmt(from_date)} – {fmt(to_date)}"
    if from_date:
        return f"ab {fmt(from_date)}"
    if to_date:
        return f"bis {fmt(to_date)}"
    return "alle Bestellungen"


def build_statement_pdf(statement: Statement) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="BrewHub Kaffee-Abrechnung",
        author="BrewHub",
    )

    styles = getSampleStyleSheet()
    title = ParagraphStyle("title", parent=styles["Title"], textColor=COFFEE, alignment=0, fontSize=20, spaceAfter=2)
    small = ParagraphStyle("small", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#6b5546"))
    normal = ParagraphStyle("normal", parent=styles["Normal"], fontSize=10, leading=14)
    cell = ParagraphStyle("cell", parent=styles["Normal"], fontSize=9, leading=11)
    total_style = ParagraphStyle("total", parent=normal, fontSize=13, alignment=TA_RIGHT, textColor=COFFEE)

    story = [
        Paragraph("BrewHub – Kaffee-Abrechnung", title),
        Paragraph("Coffee statement", small),
        Spacer(1, 6 * mm),
    ]

    created = datetime.now(LOCAL_TZ).strftime("%d.%m.%Y %H:%M")
    info = Table(
        [
            ["Mitarbeiter", statement.employee_name],
            ["Firma", statement.company_name],
            ["E-Mail", statement.employee_email],
            ["PIN", statement.employee_pin or "–"],
            ["Zeitraum", period_text(statement.from_date, statement.to_date)],
            ["Erstellt am", created],
        ],
        colWidths=[35 * mm, 125 * mm],
        hAlign="LEFT",
    )
    info.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("TEXTCOLOR", (0, 0), (0, -1), COFFEE),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    story += [info, Spacer(1, 7 * mm)]

    header = ["Datum", "Uhrzeit", "Bestell-Nr.", "Getränk", "Anzahl", "Einzelpreis", "Summe"]
    rows = [header]
    for line in sorted(statement.lines, key=lambda l: l.ordered_at):
        when = local_time(line.ordered_at)
        rows.append(
            [
                when.strftime("%d.%m.%Y"),
                when.strftime("%H:%M"),
                (line.reference or "–")[:8],
                Paragraph(line.product, cell),
                str(line.quantity),
                euro(line.unit_price),
                euro(line.subtotal),
            ]
        )
    rows.append(["", "", "", "Gesamt", str(statement.drink_count), "", euro(statement.total)])

    table = Table(
        rows,
        colWidths=[22 * mm, 15 * mm, 22 * mm, 45 * mm, 15 * mm, 22 * mm, 23 * mm],
        repeatRows=1,
        hAlign="LEFT",
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), COFFEE),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (4, 0), (-1, -1), "RIGHT"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, CREAM]),
                ("LINEBELOW", (0, 0), (-1, -2), 0.25, LINE),
                ("LINEABOVE", (0, -1), (-1, -1), 1, COFFEE),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story += [
        table,
        Spacer(1, 8 * mm),
        Paragraph(f"<b>Offener Betrag: {euro(statement.total)}</b>", total_style),
        Spacer(1, 10 * mm),
        Paragraph(
            "Bitte begleiche den Betrag beim Kaffee-Verantwortlichen deiner Firma. "
            "Bei Fragen zu dieser Abrechnung antworte einfach auf die E-Mail.",
            small,
        ),
    ]

    doc.build(story)
    return buffer.getvalue()

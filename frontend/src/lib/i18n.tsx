import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// BrewHub translations (German default, English second)
// Add a new text: put the same key in BOTH dictionaries.
// Use {name} placeholders for values, e.g. t("order.hi", { name: "Max" }).
// ─────────────────────────────────────────────────────────────────────────────

export type Lang = "de" | "en";

const en = {
  // Header / common
  "common.admin": "Admin",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.add": "Add",
  "common.back": "Back",
  "common.refresh": "Refresh",
  "common.clear": "Clear",
  "common.firstName": "First name",
  "common.lastName": "Last name",
  "common.company": "Company",
  "common.email": "Email",
  "common.pin": "PIN",
  "common.name": "Name",
  "common.id": "ID",
  "common.actions": "Actions",
  "common.fromDate": "From date",
  "common.toDate": "To date",
  "common.noData": "No data yet",
  "common.backToKiosk": "Back to Kiosk",
  "common.language": "Language",

  // Home
  "home.welcome": "Welcome to BrewHub",
  "home.titleStart": "Pick your",
  "home.titleAccent": "company",
  "home.titleEnd": "to get brewing",
  "home.subtitle": "Tap your company below, choose your name, and pick your favorite drink.",
  "home.companies": "Companies",
  "home.countOf": "of {total}",
  "home.search": "Search companies…",
  "home.noMatch": "No companies match your search.",
  "home.noCompanies": "No companies yet. Ask the admin to add one.",
  "home.footer": "Brewed with care · BrewHub",

  // Employees
  "emp.backToCompanies": "Back to Companies",
  "emp.fallbackTitle": "Employees",
  "emp.tapName": "Tap your name to start your order.",
  "emp.search": "Search by name or employee ID…",
  "emp.addNew": "Add new employee",
  "emp.notOnList": "Not on the list? Tap to register.",
  "emp.showMore": "Show more ({count} remaining)",
  "emp.dialogTitle": "Add a new employee",
  "emp.pinPlaceholder": "e.g. 1234",
  "emp.required": "Required",
  "emp.invalidEmail": "Please enter a valid email",
  "emp.pinRequired": "PIN required",
  "emp.welcome": "Welcome, {name}!",
  "emp.notCreated": "Employee was not created",
  "emp.createFailed": "Could not create employee",

  // Order
  "order.backToEmployees": "Back to Employees",
  "order.hi": "Hi {name}!",
  "order.pick": "Pick your drinks and the quantity for each.",
  "order.decrease": "decrease",
  "order.increase": "increase",
  "order.total": "Total ({count})",
  "order.complete": "Complete order",
  "order.addOne": "Add at least one drink",
  "order.failed": "Could not place order",
  "order.confirmTitle": "Confirm your order",
  "order.confirmText": "Please review the items below before placing your order.",
  "order.totalItems": "Total ({count} items)",
  "order.totalItem": "Total (1 item)",
  "order.keepEditing": "Keep editing",
  "order.placing": "Placing…",
  "order.confirmPlace": "Confirm & place order",
  "order.placed": "Order placed!",
  "order.enjoyMany": "Enjoy your {count} drinks, {name}! ☕",
  "order.enjoyOne": "Enjoy your drink, {name}! ☕",
  "order.barista": "Your barista is on it. Have a great day!",
  "order.backHome": "Back to home",

  // Admin login
  "login.subtitle": "Login through FastAPI backend",
  "login.password": "Password",
  "login.required": "Email and password are required",
  "login.welcome": "Welcome admin",
  "login.failed": "Admin login failed",
  "login.signingIn": "Signing in…",
  "login.signIn": "Sign in",

  // Admin dashboard
  "admin.signOut": "Sign out",
  "admin.refreshed": "Data refreshed from backend",
  "admin.tab.companies": "Companies",
  "admin.tab.employees": "Employees",
  "admin.tab.products": "Products",
  "admin.tab.orders": "Orders",
  "admin.tab.export": "Export",

  "admin.company.name": "Company name",
  "admin.company.logo": "Logo URL",
  "admin.company.nameRequired": "Company name required",
  "admin.company.added": "Company added",
  "admin.company.addFailed": "Could not add company",
  "admin.company.updated": "Company updated",
  "admin.company.updateFailed": "Could not update company",
  "admin.company.confirmDelete": "Delete this company? Its employees and their orders are deleted too.",
  "admin.company.deleted": "Company deleted",
  "admin.company.deleteFailed": "Could not delete company",

  "admin.emp.updated": "Employee updated",
  "admin.emp.updateFailed": "Could not update employee",
  "admin.emp.required": "Company, name, email, and PIN are required",
  "admin.emp.added": "Employee added",
  "admin.emp.addFailed": "Could not add employee",
  "admin.emp.confirmDelete": "Delete this employee?",
  "admin.emp.deleted": "Employee deleted",
  "admin.emp.deleteFailed": "Could not delete employee",
  "admin.emp.showing": "Showing employees for {company}",
  "admin.emp.selectedCompany": "selected company",
  "admin.emp.editTitle": "Edit employee",
  "admin.emp.saving": "Saving…",
  "admin.emp.saveChanges": "Save changes",

  "admin.prod.required": "Name and valid price required",
  "admin.prod.added": "Product added",
  "admin.prod.addFailed": "Could not add product",
  "admin.prod.updated": "Product updated",
  "admin.prod.updateFailed": "Could not update product",
  "admin.prod.confirmDelete": "Delete product?",
  "admin.prod.deleted": "Product deleted",
  "admin.prod.deleteFailed": "Could not delete product",
  "admin.prod.price": "Price €",

  "admin.orders.qtySaved": "Quantity saved",
  "admin.orders.saveFailed": "Could not save",
  "admin.orders.confirmRemoveItem": "Remove \"{product}\" from this order?",
  "admin.orders.itemRemoved": "Item removed",
  "admin.orders.removeFailed": "Could not remove item",
  "admin.orders.confirmDeleteOrder": "Delete this entire order and all its items?",
  "admin.orders.deleted": "Order deleted",
  "admin.orders.deleteFailed": "Could not delete order",
  "admin.orders.confirmCleanup": "This will permanently delete ALL orders older than 30 days. Continue?",
  "admin.orders.cleaned": "Deleted {count} old order(s)",
  "admin.orders.cleanupFailed": "Cleanup failed",
  "admin.orders.countOne": "1 order · edit quantity and click away to save",
  "admin.orders.countMany": "{count} orders · edit quantity and click away to save",
  "admin.orders.date": "Date",
  "admin.orders.ref": "Ref #",
  "admin.orders.product": "Product",
  "admin.orders.qty": "Qty",
  "admin.orders.unit": "Unit €",
  "admin.orders.subtotal": "Subtotal €",
  "admin.orders.orderTotal": "Order Total €",
  "admin.orders.removeItem": "Remove this item",
  "admin.orders.deleteOrder": "Delete entire order",
  "admin.orders.cleanupTitle": "Monthly cleanup",
  "admin.orders.cleanupText": "Permanently deletes all orders and their items older than 30 days.",
  "admin.orders.cleanupButton": "Clear orders >30 days",

  "admin.export.created": "Export created",
  "admin.export.downloaded": "Export downloaded successfully",
  "admin.export.failed": "Could not export report",
  "admin.export.title": "Export orders",
  "admin.export.calls": "Calls",
  "admin.export.onBackend": "on your FastAPI backend. Leave dates blank to export everything.",
  "admin.export.exporting": "Exporting…",
  "admin.export.download": "Download Excel report",
  "admin.export.file": "Downloaded:",

  "admin.mail.title": "E-mail statements",
  "admin.mail.description": "Sends every employee who ordered in this period an e-mail with the amount due and a PDF of all orders.",
  "admin.mail.allCompanies": "All companies",
  "admin.mail.testLabel": "Test address (optional)",
  "admin.mail.testPlaceholder": "your.address@gmail.com",
  "admin.mail.testHint": "If filled in, max. 3 statements go ONLY to this address. Leave empty to send to all employees.",
  "admin.mail.sendAll": "Send statements to all employees",
  "admin.mail.sendTest": "Send test e-mails",
  "admin.mail.sending": "Sending…",
  "admin.mail.confirmReal": "Send an e-mail with the statement to EVERY employee who ordered in this period?",
  "admin.mail.confirmTest": "Send up to 3 test statements to {email}?",
  "admin.mail.done": "{count} e-mail(s) sent",
  "admin.mail.someFailed": "{count} e-mail(s) could not be sent",
  "admin.mail.failed": "Could not send the e-mails",
  "admin.mail.summary": "{sent} of {employees} statements sent · total {total}",
  "admin.mail.nothing": "No orders in this period.",

  // Validation messages
  "val.required": "This field is required.",
  "val.name_too_short": "At least 2 characters.",
  "val.name_too_long": "Max. 50 characters.",
  "val.name_has_digits": "Names cannot contain numbers.",
  "val.name_invalid_chars": "Only letters, spaces, hyphen (-) and apostrophe ('). Start with a letter.",
  "val.email_invalid": "Please enter a valid e-mail address, e.g. name@gmail.com.",
  "val.email_domain_not_allowed": "Only @gmail.com or an e-mail address of your company is allowed.",
  "val.gmail_invalid_chars": "Gmail addresses may only contain letters, numbers and dots.",
  "val.gmail_length": "The part before @gmail.com must have 6 to 30 characters.",
  "val.email_taken": "This e-mail address is already registered.",
  "val.pin_invalid": "The PIN must have 4 to 6 digits (numbers only).",
  "val.pin_taken": "This PIN is already used in this company. Please choose another one.",
  "val.company_name_too_short": "At least 2 characters.",
  "val.company_name_too_long": "Max. 60 characters.",
  "val.company_name_taken": "A company with this name already exists.",
  "val.logo_invalid": "Must start with https:// or /company-logos/.",
  "val.domain_invalid": "Enter domains like th-deg.de, separated by commas (without https:// or @).",
  "val.product_name_too_short": "At least 2 characters.",
  "val.product_name_too_long": "Max. 40 characters.",
  "val.product_name_taken": "A drink with this name already exists.",
  "val.price_invalid": "Please enter a number, e.g. 2.50.",
  "val.price_decimals": "Max. 2 decimal places.",
  "val.price_range": "The price must be between 0.10 € and 20.00 €.",
  "val.quantity_invalid": "Please enter a whole number.",
  "val.quantity_range": "The quantity must be between 1 and 20.",
  "val.date_order": "The start date must be before the end date.",
  "val.order_empty": "Please choose at least one drink.",
  "val.company_not_found": "This company does not exist anymore.",
  "val.user_not_found": "This employee does not exist anymore.",
  "val.product_not_found": "A drink in this order does not exist anymore.",
  "val.fixErrors": "Please correct the marked fields.",
  "val.hint.emailAllowed": "Allowed: {domains}",
  "val.hint.pin": "4 to 6 digits, e.g. 1234",
  "admin.company.domains": "E-mail domains",
  "admin.company.domainsPlaceholder": "e.g. th-deg.de, stud.th-deg.de",
  "admin.company.domainsHint": "Employees can register with @gmail.com or with these domains.",
  "order.maxReached": "Max. {max} per drink",

  // Error pages
  "error.notFoundTitle": "Page not found",
  "error.notFoundText": "The page you're looking for doesn't exist or has been moved.",
  "error.goHome": "Go home",
  "error.loadTitle": "This page didn't load",
  "error.loadText": "Something went wrong on our end. You can try refreshing or head back home.",
  "error.tryAgain": "Try again",
} as const;

export type TranslationKey = keyof typeof en;

const de: Record<TranslationKey, string> = {
  // Header / common
  "common.admin": "Admin",
  "common.cancel": "Abbrechen",
  "common.save": "Speichern",
  "common.add": "Hinzufügen",
  "common.back": "Zurück",
  "common.refresh": "Aktualisieren",
  "common.clear": "Zurücksetzen",
  "common.firstName": "Vorname",
  "common.lastName": "Nachname",
  "common.company": "Firma",
  "common.email": "E-Mail",
  "common.pin": "PIN",
  "common.name": "Name",
  "common.id": "ID",
  "common.actions": "Aktionen",
  "common.fromDate": "Von",
  "common.toDate": "Bis",
  "common.noData": "Noch keine Daten",
  "common.backToKiosk": "Zurück zum Kiosk",
  "common.language": "Sprache",

  // Home
  "home.welcome": "Willkommen bei BrewHub",
  "home.titleStart": "Wähle deine",
  "home.titleAccent": "Firma",
  "home.titleEnd": "und los geht's",
  "home.subtitle": "Tippe unten auf deine Firma, wähle deinen Namen und dein Lieblingsgetränk.",
  "home.companies": "Firmen",
  "home.countOf": "von {total}",
  "home.search": "Firmen suchen …",
  "home.noMatch": "Keine Firma passt zu deiner Suche.",
  "home.noCompanies": "Noch keine Firmen. Bitte den Admin, eine hinzuzufügen.",
  "home.footer": "Mit Liebe gebrüht · BrewHub",

  // Employees
  "emp.backToCompanies": "Zurück zu den Firmen",
  "emp.fallbackTitle": "Mitarbeiter",
  "emp.tapName": "Tippe auf deinen Namen, um zu bestellen.",
  "emp.search": "Nach Name oder Mitarbeiter-ID suchen …",
  "emp.addNew": "Neuer Mitarbeiter",
  "emp.notOnList": "Nicht in der Liste? Tippe hier, um dich zu registrieren.",
  "emp.showMore": "Mehr anzeigen (noch {count})",
  "emp.dialogTitle": "Neuen Mitarbeiter hinzufügen",
  "emp.pinPlaceholder": "z. B. 1234",
  "emp.required": "Pflichtfeld",
  "emp.invalidEmail": "Bitte gib eine gültige E-Mail-Adresse ein",
  "emp.pinRequired": "PIN ist erforderlich",
  "emp.welcome": "Willkommen, {name}!",
  "emp.notCreated": "Mitarbeiter wurde nicht angelegt",
  "emp.createFailed": "Mitarbeiter konnte nicht angelegt werden",

  // Order
  "order.backToEmployees": "Zurück zu den Mitarbeitern",
  "order.hi": "Hallo {name}!",
  "order.pick": "Wähle deine Getränke und die Anzahl.",
  "order.decrease": "weniger",
  "order.increase": "mehr",
  "order.total": "Summe ({count})",
  "order.complete": "Bestellung abschließen",
  "order.addOne": "Bitte wähle mindestens ein Getränk",
  "order.failed": "Bestellung konnte nicht gespeichert werden",
  "order.confirmTitle": "Bestellung bestätigen",
  "order.confirmText": "Bitte prüfe deine Getränke, bevor du bestellst.",
  "order.totalItems": "Summe ({count} Getränke)",
  "order.totalItem": "Summe (1 Getränk)",
  "order.keepEditing": "Weiter bearbeiten",
  "order.placing": "Wird gesendet …",
  "order.confirmPlace": "Bestätigen & bestellen",
  "order.placed": "Bestellung aufgegeben!",
  "order.enjoyMany": "Genieß deine {count} Getränke, {name}! ☕",
  "order.enjoyOne": "Genieß dein Getränk, {name}! ☕",
  "order.barista": "Dein Kaffee ist unterwegs. Einen schönen Tag!",
  "order.backHome": "Zur Startseite",

  // Admin login
  "login.subtitle": "Anmeldung über das FastAPI-Backend",
  "login.password": "Passwort",
  "login.required": "E-Mail und Passwort sind erforderlich",
  "login.welcome": "Willkommen, Admin",
  "login.failed": "Admin-Anmeldung fehlgeschlagen",
  "login.signingIn": "Anmeldung …",
  "login.signIn": "Anmelden",

  // Admin dashboard
  "admin.signOut": "Abmelden",
  "admin.refreshed": "Daten vom Backend aktualisiert",
  "admin.tab.companies": "Firmen",
  "admin.tab.employees": "Mitarbeiter",
  "admin.tab.products": "Getränke",
  "admin.tab.orders": "Bestellungen",
  "admin.tab.export": "Export",

  "admin.company.name": "Firmenname",
  "admin.company.logo": "Logo-URL",
  "admin.company.nameRequired": "Firmenname ist erforderlich",
  "admin.company.added": "Firma hinzugefügt",
  "admin.company.addFailed": "Firma konnte nicht hinzugefügt werden",
  "admin.company.updated": "Firma aktualisiert",
  "admin.company.updateFailed": "Firma konnte nicht aktualisiert werden",
  "admin.company.confirmDelete": "Firma löschen? Ihre Mitarbeiter und deren Bestellungen werden auch gelöscht.",
  "admin.company.deleted": "Firma gelöscht",
  "admin.company.deleteFailed": "Firma konnte nicht gelöscht werden",

  "admin.emp.updated": "Mitarbeiter aktualisiert",
  "admin.emp.updateFailed": "Mitarbeiter konnte nicht aktualisiert werden",
  "admin.emp.required": "Firma, Name, E-Mail und PIN sind erforderlich",
  "admin.emp.added": "Mitarbeiter hinzugefügt",
  "admin.emp.addFailed": "Mitarbeiter konnte nicht hinzugefügt werden",
  "admin.emp.confirmDelete": "Diesen Mitarbeiter löschen?",
  "admin.emp.deleted": "Mitarbeiter gelöscht",
  "admin.emp.deleteFailed": "Mitarbeiter konnte nicht gelöscht werden",
  "admin.emp.showing": "Mitarbeiter von {company}",
  "admin.emp.selectedCompany": "der gewählten Firma",
  "admin.emp.editTitle": "Mitarbeiter bearbeiten",
  "admin.emp.saving": "Speichern …",
  "admin.emp.saveChanges": "Änderungen speichern",

  "admin.prod.required": "Name und gültiger Preis sind erforderlich",
  "admin.prod.added": "Getränk hinzugefügt",
  "admin.prod.addFailed": "Getränk konnte nicht hinzugefügt werden",
  "admin.prod.updated": "Getränk aktualisiert",
  "admin.prod.updateFailed": "Getränk konnte nicht aktualisiert werden",
  "admin.prod.confirmDelete": "Getränk löschen?",
  "admin.prod.deleted": "Getränk gelöscht",
  "admin.prod.deleteFailed": "Getränk konnte nicht gelöscht werden",
  "admin.prod.price": "Preis €",

  "admin.orders.qtySaved": "Anzahl gespeichert",
  "admin.orders.saveFailed": "Speichern fehlgeschlagen",
  "admin.orders.confirmRemoveItem": "\"{product}\" aus dieser Bestellung entfernen?",
  "admin.orders.itemRemoved": "Getränk entfernt",
  "admin.orders.removeFailed": "Getränk konnte nicht entfernt werden",
  "admin.orders.confirmDeleteOrder": "Diese Bestellung mit allen Getränken löschen?",
  "admin.orders.deleted": "Bestellung gelöscht",
  "admin.orders.deleteFailed": "Bestellung konnte nicht gelöscht werden",
  "admin.orders.confirmCleanup": "Damit werden ALLE Bestellungen, die älter als 30 Tage sind, endgültig gelöscht. Fortfahren?",
  "admin.orders.cleaned": "{count} alte Bestellung(en) gelöscht",
  "admin.orders.cleanupFailed": "Bereinigung fehlgeschlagen",
  "admin.orders.countOne": "1 Bestellung · Anzahl ändern und daneben klicken, um zu speichern",
  "admin.orders.countMany": "{count} Bestellungen · Anzahl ändern und daneben klicken, um zu speichern",
  "admin.orders.date": "Datum",
  "admin.orders.ref": "Ref.-Nr.",
  "admin.orders.product": "Getränk",
  "admin.orders.qty": "Anzahl",
  "admin.orders.unit": "Einzelpreis €",
  "admin.orders.subtotal": "Zwischensumme €",
  "admin.orders.orderTotal": "Gesamt €",
  "admin.orders.removeItem": "Dieses Getränk entfernen",
  "admin.orders.deleteOrder": "Ganze Bestellung löschen",
  "admin.orders.cleanupTitle": "Monatliche Bereinigung",
  "admin.orders.cleanupText": "Löscht alle Bestellungen, die älter als 30 Tage sind, endgültig.",
  "admin.orders.cleanupButton": "Bestellungen >30 Tage löschen",

  "admin.export.created": "Export erstellt",
  "admin.export.downloaded": "Export erfolgreich heruntergeladen",
  "admin.export.failed": "Bericht konnte nicht exportiert werden",
  "admin.export.title": "Bestellungen exportieren",
  "admin.export.calls": "Ruft",
  "admin.export.onBackend": "im FastAPI-Backend auf. Ohne Datum wird alles exportiert.",
  "admin.export.exporting": "Wird exportiert …",
  "admin.export.download": "Excel-Bericht herunterladen",
  "admin.export.file": "Heruntergeladen:",

  "admin.mail.title": "Abrechnung per E-Mail",
  "admin.mail.description": "Schickt jedem Mitarbeiter, der in diesem Zeitraum bestellt hat, eine E-Mail mit dem offenen Betrag und einem PDF aller Bestellungen.",
  "admin.mail.allCompanies": "Alle Firmen",
  "admin.mail.testLabel": "Testadresse (optional)",
  "admin.mail.testPlaceholder": "deine.adresse@gmail.com",
  "admin.mail.testHint": "Wenn ausgefüllt, gehen max. 3 Abrechnungen NUR an diese Adresse. Leer lassen, um an alle Mitarbeiter zu senden.",
  "admin.mail.sendAll": "Abrechnung an alle Mitarbeiter senden",
  "admin.mail.sendTest": "Test-E-Mails senden",
  "admin.mail.sending": "Wird gesendet …",
  "admin.mail.confirmReal": "Jedem Mitarbeiter, der in diesem Zeitraum bestellt hat, eine E-Mail mit der Abrechnung senden?",
  "admin.mail.confirmTest": "Bis zu 3 Test-Abrechnungen an {email} senden?",
  "admin.mail.done": "{count} E-Mail(s) gesendet",
  "admin.mail.someFailed": "{count} E-Mail(s) konnten nicht gesendet werden",
  "admin.mail.failed": "E-Mails konnten nicht gesendet werden",
  "admin.mail.summary": "{sent} von {employees} Abrechnungen gesendet · gesamt {total}",
  "admin.mail.nothing": "Keine Bestellungen in diesem Zeitraum.",

  // Validation messages
  "val.required": "Dieses Feld ist erforderlich.",
  "val.name_too_short": "Mindestens 2 Zeichen.",
  "val.name_too_long": "Höchstens 50 Zeichen.",
  "val.name_has_digits": "Namen dürfen keine Zahlen enthalten.",
  "val.name_invalid_chars": "Nur Buchstaben, Leerzeichen, Bindestrich (-) und Apostroph ('). Mit einem Buchstaben beginnen.",
  "val.email_invalid": "Bitte eine gültige E-Mail-Adresse eingeben, z. B. name@gmail.com.",
  "val.email_domain_not_allowed": "Nur @gmail.com oder eine E-Mail-Adresse deiner Firma ist erlaubt.",
  "val.gmail_invalid_chars": "Gmail-Adressen dürfen nur Buchstaben, Zahlen und Punkte enthalten.",
  "val.gmail_length": "Der Teil vor @gmail.com muss 6 bis 30 Zeichen haben.",
  "val.email_taken": "Diese E-Mail-Adresse ist bereits registriert.",
  "val.pin_invalid": "Die PIN muss 4 bis 6 Ziffern haben (nur Zahlen).",
  "val.pin_taken": "Diese PIN wird in dieser Firma schon verwendet. Bitte wähle eine andere.",
  "val.company_name_too_short": "Mindestens 2 Zeichen.",
  "val.company_name_too_long": "Höchstens 60 Zeichen.",
  "val.company_name_taken": "Eine Firma mit diesem Namen gibt es schon.",
  "val.logo_invalid": "Muss mit https:// oder /company-logos/ beginnen.",
  "val.domain_invalid": "Domains wie th-deg.de eingeben, mit Komma getrennt (ohne https:// oder @).",
  "val.product_name_too_short": "Mindestens 2 Zeichen.",
  "val.product_name_too_long": "Höchstens 40 Zeichen.",
  "val.product_name_taken": "Ein Getränk mit diesem Namen gibt es schon.",
  "val.price_invalid": "Bitte eine Zahl eingeben, z. B. 2,50.",
  "val.price_decimals": "Höchstens 2 Nachkommastellen.",
  "val.price_range": "Der Preis muss zwischen 0,10 € und 20,00 € liegen.",
  "val.quantity_invalid": "Bitte eine ganze Zahl eingeben.",
  "val.quantity_range": "Die Anzahl muss zwischen 1 und 20 liegen.",
  "val.date_order": "Das Startdatum muss vor dem Enddatum liegen.",
  "val.order_empty": "Bitte wähle mindestens ein Getränk.",
  "val.company_not_found": "Diese Firma gibt es nicht mehr.",
  "val.user_not_found": "Diesen Mitarbeiter gibt es nicht mehr.",
  "val.product_not_found": "Ein Getränk in dieser Bestellung gibt es nicht mehr.",
  "val.fixErrors": "Bitte korrigiere die markierten Felder.",
  "val.hint.emailAllowed": "Erlaubt: {domains}",
  "val.hint.pin": "4 bis 6 Ziffern, z. B. 1234",
  "admin.company.domains": "E-Mail-Domains",
  "admin.company.domainsPlaceholder": "z. B. th-deg.de, stud.th-deg.de",
  "admin.company.domainsHint": "Mitarbeiter können sich mit @gmail.com oder mit diesen Domains registrieren.",
  "order.maxReached": "Max. {max} pro Getränk",

  // Error pages
  "error.notFoundTitle": "Seite nicht gefunden",
  "error.notFoundText": "Die gesuchte Seite gibt es nicht oder sie wurde verschoben.",
  "error.goHome": "Zur Startseite",
  "error.loadTitle": "Diese Seite konnte nicht geladen werden",
  "error.loadText": "Bei uns ist etwas schiefgelaufen. Lade die Seite neu oder geh zur Startseite.",
  "error.tryAgain": "Erneut versuchen",
};

const dictionaries: Record<Lang, Record<TranslationKey, string>> = { en, de };

export function isTranslationKey(key: string): key is TranslationKey {
  return key in en;
}

/** Message for a validation code (from validation.ts or from the backend). */
export function validationText(t: Translate, code: string | null | undefined): string {
  if (!code) return "";
  const key = `val.${code}`;
  return isTranslationKey(key) ? t(key) : code;
}

/** Message for a caught error: translated backend code, or the error text, or a fallback. */
export function errorText(t: Translate, error: unknown, fallback: TranslationKey): string {
  const code = (error as { code?: string } | null)?.code;
  if (code && isTranslationKey(`val.${code}`)) return validationText(t, code);
  return error instanceof Error && error.message ? error.message : t(fallback);
}

const STORAGE_KEY = "brewhub.lang";
const DEFAULT_LANG: Lang = "de";

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translate;
};

function format(text: string, vars?: Record<string, string | number>) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

function makeT(lang: Lang): Translate {
  return (key, vars) => format(dictionaries[lang][key] ?? en[key] ?? key, vars);
}

const I18nContext = createContext<I18nContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: makeT(DEFAULT_LANG),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // Read the saved choice after the first render (server render uses the default).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "de" || saved === "en") setLangState(saved);
    } catch {
      // storage not available: keep the default
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage not available: the choice lasts until reload
    }
  }, []);

  const value = useMemo(() => ({ lang, setLang, t: makeT(lang) }), [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

/** Small DE | EN switch for headers. */
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const options: Lang[] = ["de", "en"];
  return (
    <div
      role="group"
      aria-label={t("common.language")}
      className={`inline-flex items-center rounded-full border border-border/60 bg-card/80 p-0.5 text-xs font-semibold shadow-sm ${className}`}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLang(option)}
          aria-pressed={lang === option}
          className={`rounded-full px-2.5 py-1 transition-colors ${
            lang === option ? "bg-primary text-primary-foreground" : "text-mocha hover:text-primary"
          }`}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

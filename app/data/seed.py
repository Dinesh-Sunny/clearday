"""Snapshot of the Seapoint Staging sandbox (both orgs), pulled through the Seapoint MCP on 20 Oct 2026 18:20.

Refresh: in Claude Code run `/seapoint-sync` (.claude/commands/seapoint-sync.md) - it re-runs the same MCP queries
and rewrites the data below. Run: python3 app/data/seed.py  ->  app/data/sandbox.json
"""
import json, os

UK, IE = "org_01m5d48xf0f6ebbh1jhzn1w45d", "org_01m5d48zxse49a5w6pps8yhd15"
company = {"id": UK, "name": "Northstar Labs", "stage": "Seed", "currency": "GBP", "today": "2026-10-20",
           "cash_buffer": 250000, "source": "Seapoint Staging MCP", "synced_at": "20 Oct 2026, 18:20"}
people = [
    {"id": "p_founder", "name": "Dinesh", "role": "Founder and CEO", "approval_limit": 25000},
    {"id": "p_cfo", "name": "Doruk Gunes", "role": "Finance lead", "approval_limit": 150000},
]
entities = [
    {"id": UK, "name": "Northstar Labs Ltd (UK)", "short": "UK", "currency": "GBP", "fx_to_gbp": 1.0},
    {"id": IE, "name": "Northstar Labs (IE)", "short": "IE", "currency": "EUR", "fx_to_gbp": 0.842524},
]
accounts = [
    {"id": "inv_3g18mkr9g8kkbkcgwdscmh6c1e", "entity": UK, "name": "Northstar Labs Ltd Treasury", "type": "INVESTMENT", "currency": "GBP", "balance": 1200687.46, "net_yield_pct": 3.42},
    {"id": "acc_74fv0r07524xv9hp8qr3gz4pfm", "entity": UK, "name": "Northstar Modulr GBP", "type": "BANKING", "currency": "GBP", "balance": 565400.20},
    {"id": "acc_7mstmyyqkg40bp3ev3w417ad3q", "entity": UK, "name": "HSBC Business Current", "type": "BANKING", "currency": "GBP", "balance": 486320.18},
    {"id": "acc_5bhfz7g064fgvxdrkn8xzw5819", "entity": UK, "name": "Northstar Modulr EUR", "type": "BANKING", "currency": "EUR", "balance": 168400.75, "fx": 0.842524},
    {"id": "acc_5t1n0j3zca7d70t79mwwh17k7r", "entity": UK, "name": "Revolut Business GBP", "type": "BANKING", "currency": "GBP", "balance": 64820.35},
    {"id": "acc_63wg4pz5ct73bwecj27jpav6k4", "entity": IE, "name": "AIB Business EUR", "type": "BANKING", "currency": "EUR", "balance": 140565.20, "fx": 0.842524},
]
# Monthly cash in/out per org in its reporting currency (query_transactions aggregate by month + direction).
monthly = {
    UK: {"2026-07": {"in": 8580, "out": 124805.56}, "2026-08": {"in": 12980, "out": 137026.45},
         "2026-09": {"in": 39830, "out": 162333.84}, "2026-10": {"in": 8580, "out": 79958.79}},
    IE: {"2026-07": {"in": 10700, "out": 23251.60}, "2026-08": {"in": 6500, "out": 14871.30},
         "2026-09": {"in": 11350, "out": 23859.75}, "2026-10": {"in": 7150, "out": 7158.85}},
}
spend_by_category = {  # UK org, GBP (aggregate by month + category_id, labelled via query_categories)
    "2026-08": {"Payroll & Benefits": 59600, "Hosting & Infrastructure": 34081, "Marketing & Advertising": 17095.56, "Travel & Entertainment": 9622.25,
                "Legal & Professional Fees": 6200, "Subscriptions": 4500.40, "Rent": 2350, "Office Expenses": 1809, "Food & Dining": 1355.69,
                "Bank Fees": 235.55, "General Expenses": 177},
    "2026-09": {"Payroll & Benefits": 69000, "Hosting & Infrastructure": 31949, "Marketing & Advertising": 16582.66, "Travel & Entertainment": 9451.50,
                "Subscriptions": 8847.59, "Legal & Professional Fees": 7940, "Rent": 6750, "Capital Investments": 4774.80, "Sales Tax / VAT": 3600,
                "Office Expenses": 1826.12, "Food & Dining": 1390.10, "Bank Fees": 222.07},
}
spend_counts = {"2026-08": {"Rent": 1, "Subscriptions": 7, "Payroll & Benefits": 5}, "2026-09": {"Rent": 3, "Subscriptions": 14, "Payroll & Benefits": 8}}


def bill(i, vendor, ref, total, net, vat, rate, cur, inv_date, due, source, country="GB", vat_no=None, extra=None):
    d = {"id": i, "vendor": vendor, "ref": ref, "amount": total, "net": net, "vat": vat, "vat_rate": rate, "currency": cur,
         "invoice_date": inv_date, "due": due, "source": source, "vendor_country": country, "vat_number": vat_no, "status": "approved", "entity": UK}
    d.update(extra or {})
    return d


bills = [  # query_invoices is_paid=false (all in the UK org)
    bill("evi_22vdawhqm311cmcwa33jgzcyxa", "WeWork UK Ltd", "WW-UK-2026-11-4B", 2950, 2458.33, 491.67, 20, "GBP", "2026-10-13", "2026-11-01", "EMAIL_SCAN"),
    bill("evi_2ykddr6xhe9kwmc79zb4axpxfa", "Wren & Fielding LLP", "INV-WF-2291", 2150, 1791.67, 358.33, 20, "GBP", "2026-10-11", "2026-11-10", "EMAIL_SCAN"),
    bill("evi_7cy5mhm2ccc2jf39zdrwkxjkt2", "HubSpot UK Ltd", "HS-2026-8120", 2480, 2066.67, 413.33, 20, "GBP", "2026-10-08", "2026-11-07", "EMAIL_SCAN"),
    bill("evi_4q3hqxbrtjst62065v7f18r6jg", "Clearview Media Ltd", "CM-2026-114", 3400, 2833.33, 566.67, 20, "GBP", "2026-10-07", "2026-11-06", "EMAIL_SCAN"),
    bill("evi_66z6tdxxck7tz8vgrc8t9v0xr7", "Halberd Security Ltd", "HAL-3310", 4250, 3541.67, 708.33, 20, "GBP", "2026-10-06", "2026-11-05", "EMAIL_SCAN", extra={"note": "work done in September"}),
    bill("evi_6ardg4hss119gt2fvsjm9t23pn", "Meridian Translations BV", "MT-2026-0442", 1840, 1840, 0, 0, "EUR", "2026-10-02", "2026-11-01", "EMAIL_SCAN", "GB", "NL 861 447 209 B01"),
    bill("evi_1bgj75cx7yshcrfq147a0tgf80", "Connolly Accountants Ltd", "CA-2026-0918", 1800, 1500, 300, 20, "GBP", "2026-10-05", "2026-10-26", "EMAIL_SCAN"),
    bill("evi_2yz45znspa2j8na8cszhx6grbc", "Harbourline Logistics Ltd", "HL-77120", 612.48, 612.48, 0, 0, "GBP", "2026-10-04", "2026-10-25", "EMAIL_SCAN"),
    bill("evi_0f2g4hz0r82p6yagnfz3eggzt7", "Amazon Web Services UK Ltd", "AWS-INV-45190", 7204.20, 6003.50, 1200.70, 20, "GBP", "2026-10-10", "2026-10-24", "EMAIL_SCAN"),
    bill("evi_7hy9nckyzxhvwc8vbygyd9af0t", "Slack Technologies Ltd", "SLK-7188", 486, 405, 81, 20, "GBP", "2026-10-09", "2026-10-23", "EMAIL_SCAN"),
    bill("evi_4m21y39zsygvq7wbwxa0twk54n", "Northwind Facilities Ltd", "NW-88431", 975, 812.50, 162.50, 20, "GBP", "2026-09-23", "2026-10-07", "EMAIL_SCAN"),
    bill("evi_17zd9jaqsznxfek7r6c4yatssd", "Remote People Ltd", "RP-2026-10-118", 33600, 33400, 200, 20, "GBP", "2026-10-10", "2026-10-25", "EMAIL_SCAN"),
    bill("evi_2egsk3mbtge5t79pb8zq7fhmtd", "Clearview Media Ltd", "CM-2026-114", 3400, 2833.33, 566.67, 20, "GBP", "2026-10-07", "2026-11-06", "UPLOAD"),
    bill("evi_1rk85rwaw5swksx2kn399mzets", "Fathom Talent Partners Ltd", "FTP-0931", 14400, 12000, 2400, 20, "GBP", "2026-10-06", "2026-10-20", "EMAIL_SCAN"),
    bill("evi_7n3g8080c1qa6hkx4vsg113bee", "PyCon UK Society", "PYC-26-1187", 135, 112.50, 22.50, 20, "GBP", "2026-09-19", "2026-10-20", "EMPLOYEE_BOOKKEEPING_UPLOAD",
         extra={"note": "Paid personally by Isla Fraser on 19 Sep, submitted 6 Oct for reimbursement", "reimburse_to": "Isla Fraser"}),
    bill("evi_20djg3kv4h7jcq0w6j9j7s252j", "Lodgewood Travel Ltd", "LWT-55120", 6300, 6300, 0, 0, "GBP", "2026-10-02", "2026-10-09", "EMAIL_SCAN"),
    bill("evi_69egvrna89pw94bqv5frcdc116", "Sentry", "SEN-2026-10-4471", 2800, 2333.33, 466.67, 20, "GBP", "2026-10-01", "2026-10-05", "EMAIL_SCAN"),
    bill("evi_2dekxq4pta0zcz39qys7g78r6x", "Nordhaus Studio BV", "NHS-2026-0142", 9000, 9000, 0, 0, "EUR", "2026-10-01", "2026-10-19", "EMAIL_SCAN", "NL", "NL 8604 12 345 B01", {"note": "VAT reverse charged"}),
    bill("evi_1sqhhsfmd18s0nxm8c8tjd99pb", "Anthropic, PBC", "ANT-INV-2026-09-0412", 1385.20, 1385.20, 0, 0, "USD", "2026-10-01", "2026-10-10", "EMAIL_SCAN", "US"),
    bill("evi_0h2m2wk0zwkfjbpsvyt4e5cn2a", "Snowflake Computing UK Ltd", "SNF-INV-2026-10", 21800, 18166.67, 3633.33, 20, "GBP", "2026-10-01", "2026-10-15", "EMAIL_SCAN"),
    bill("evi_06trxzamcp97fy753ysh03kfyb", "Snowflake Computing UK Ltd", "SNF-INV-2026-10", 21800, 18166.67, 3633.33, 20, "GBP", "2026-10-01", "2026-10-15", "EMAIL_FORWARD"),
    bill("evi_2m304vw3vje4jvmctbb5tz2wrr", "Northwind Facilities Ltd", "NW-88690", 975, 812.50, 162.50, 20, "GBP", "2026-09-30", "2026-10-14", "EMAIL_SCAN"),
    bill("evi_3ymxwhz90ry1q0peemv4ve73c3", "Harrison & Webb Solicitors LLP", "HW-2026-117", 2750, 2291.67, 458.33, 20, "GBP", "2026-09-29", "2026-10-13", "EMAIL_SCAN"),
    bill("evi_12nn6svhajarcyk048kva8ychz", "Meridian Insurance Brokers Ltd", "MIB-2026-330", 1240, 1240, 0, 0, "GBP", "2026-09-16", "2026-09-23", "EMAIL_SCAN",
         extra={"paid_by_txn": "txn_438m2nm98e4rnx4wegpjy2d6v5"}),
    bill("evi_6gsyw0xrg7rggv63034k2vgx0e", "Harbourline Logistics Ltd", "HL-76890", 540, 540, 0, 0, "GBP", "2026-09-01", "2026-09-15", "EMAIL_SCAN"),
]
payments = [  # query_payments status created / scheduled
    {"id": "pi_272t25frt9bhn8fdzrbgxzfq6h", "status": "created", "amount": 3400, "currency": "GBP", "reference": "CM-2026-114", "payee": "Clearview Media Ltd",
     "payee_kind": "scan", "account_last_four": "9047", "paying_account": "HSBC Business Current", "invoice_id": "evi_4q3hqxbrtjst62065v7f18r6jg", "scheduled_date": None},
    {"id": "pi_0732n4sb4dqqzf0edy4bbszy5x", "status": "created", "amount": 2350, "currency": "GBP", "reference": "UNIT-4B rent", "payee": "WeWork UK Ltd",
     "payee_kind": "beneficiary", "paying_account": "HSBC Business Current", "invoice_id": None, "scheduled_date": "2026-10-18"},
]
cards = [
    {"id": "card_7gne6ecyawark3gh647bap2dsv", "name": "Travel card", "last_four": "7302", "status": "frozen", "holder": "Rhys Owen", "limit": 2000, "spent_this_month": 0},
    {"id": "card_6hw2yqqsprkthhpzv0xewnmeqr", "name": "Marketing card", "last_four": "4821", "status": "active", "holder": "Priya Chandra", "limit": 5000, "spent_this_month": 8.13},
    {"id": "card_5ygrxeyme8h8cb7n430nvq82w9", "name": "Subscriptions", "last_four": "9113", "status": "active", "holder": "Priya Chandra", "limit": 1500, "spent_this_month": 0},
    {"id": "card_4dnhw7kajj1edwtbx248ag07nb", "name": "Old project card", "last_four": "0007", "status": "cancelled", "holder": "Isla Fraser", "limit": 500, "spent_this_month": 0},
    {"id": "card_3x2rm2889zq1yxna4nhn78yzff", "name": "Engineering tools", "last_four": "5540", "status": "active", "holder": "Isla Fraser", "limit": 2500, "spent_this_month": 0},
]
review = [  # bookkeeping "Needs review" since 1 Sep (query_transactions)
    {"id": "txn_3ecdxjq4mz3c0kpwsj3kew6hye", "date": "2026-10-12", "amount": 1800, "desc": "CONNOLLY ACCOUNTANTS - monthly bookkeeping", "ref": "AUG-001", "vendor": "Connolly Accountants",
     "category": "Legal & Professional Fees", "evidence": True, "code": "401 Audit and Accountancy", "tax": "INPUT2 20%", "holder": None},
    {"id": "txn_47g6c2rd8acm49j97wppe2t8a6", "date": "2026-10-01", "amount": 46.28, "desc": "WISE - cross-border transfer fee", "ref": "WISE-FEE-0912", "vendor": "Wise",
     "category": "Bank Fees", "evidence": False, "code": "404 Bank Fees", "tax": "EXEMPTEXPENSES 0%", "holder": None, "no_receipt_needed": True},
    {"id": "txn_3ksg2gqr8kz6t058npsh1te2x9", "date": "2026-09-25", "amount": 318.55, "desc": "PINNACLE OFFICE SUPPLIES - print order", "ref": "POS-11284", "vendor": "Pinnacle Office Supplies",
     "category": "Office Expenses", "evidence": True, "code": "461 Printing & Stationery", "tax": "INPUT2 20%", "holder": None},
    {"id": "txn_438m2nm98e4rnx4wegpjy2d6v5", "date": "2026-09-23", "amount": 1240, "desc": "MERIDIAN INSURANCE BROKERS - PI renewal", "ref": "MIB-2026-330", "vendor": "Meridian Insurance Brokers",
     "category": "Legal & Professional Fees", "evidence": False, "code": "433 Insurance", "tax": "EXEMPTEXPENSES 0%", "holder": None, "invoice_on_file": "evi_12nn6svhajarcyk048kva8ychz"},
    {"id": "txn_1ax12htt4cfgwtxv4esd8k3a24", "date": "2026-09-22", "amount": 89, "desc": "PREMIER INN MANCHESTER CITY", "vendor": "Premier Inn", "category": "Travel & Entertainment",
     "evidence": False, "code": None, "tax": None, "card": "Travel card ·7302", "holder": "Rhys Owen"},
    {"id": "txn_5k8mz0hhb0hermfqb5fag0rb4n", "date": "2026-09-17", "amount": 62.34, "desc": "CURRYS PC WORLD 0412", "vendor": "Currys", "category": "Office Expenses",
     "evidence": False, "code": None, "tax": None, "card": "Engineering tools ·5540", "holder": "Isla Fraser"},
    {"id": "txn_39ykrkhfyf8g2gxh5g061mt1h1", "date": "2026-09-09", "amount": 47.98, "desc": "AMAZON.CO.UK*2K4LM8QX3", "vendor": "Amazon UK", "category": "Office Expenses",
     "evidence": False, "code": None, "tax": None, "card": "Marketing card ·4821", "holder": "Priya Chandra"},
    {"id": "txn_3e8n6a774snztecwfkfxpq9797", "date": "2026-10-02", "amount": 217.20, "desc": "Management fee for September", "vendor": "Unknown Management Fee Vendor",
     "vendor_id": "ven_64htce5vpb7t5jzz0mk5ve6zg5", "category": "Bank Fees", "evidence": False, "code": None, "tax": None, "holder": None},
    {"id": "txn_62jx5w14pa5q7vxqe0kdm80tkm", "date": "2026-09-02", "amount": 180.07, "desc": "Management fee for August", "vendor": "Unknown Management Fee Vendor",
     "vendor_id": "ven_64htce5vpb7t5jzz0mk5ve6zg5", "category": "Bank Fees", "evidence": False, "code": None, "tax": None, "holder": None},
]
payroll = [
    {"id": "payroll_66w493d4mg02vqfdw6h8z2x08v", "name": "August 2026 Payroll", "status": "paid", "period": "2026-08-01 to 2026-08-28", "pay_date": "2026-08-25", "net": 11800},
    {"id": "payroll_65yqg91938401vr1arh3xc5kjr", "name": "October 2026 Payroll", "status": "paid", "period": "2026-10-01 to 2026-10-28", "pay_date": "2026-09-18", "net": 11800,
     "approved_by": "Doruk Gunes"},
]
employees = [{"name": "Priya Chandra", "role": "Operations Manager", "salary": 60000}, {"name": "Isla Fraser", "role": "Software Engineer", "salary": 78000},
             {"name": "Rhys Owen", "role": "Product Designer", "salary": 68000}]

data = dict(company=company, people=people, entities=entities, accounts=accounts, monthly=monthly, spend_by_category=spend_by_category,
            spend_counts=spend_counts, bills=bills, payments=payments, cards=cards, review=review, payroll=payroll, employees=employees)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sandbox.json")
json.dump(data, open(out, "w"), indent=1)
print(f"wrote {out}: {len(bills)} bills, {len(review)} to review, {len(payments)} payments")

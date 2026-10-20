"""Clearday server - Python stdlib only, no installs.  Run:  python3 app/server.py  then open http://localhost:8787"""
import json, os, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ENV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
if os.path.exists(ENV):
    for line in open(ENV):
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.strip().split("=", 1)
            os.environ.setdefault(k, v.strip().strip('"'))

from agent import core, llm  # noqa: E402

WEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")
BOOKS = core.Books()
TYPES = {".html": "text/html", ".css": "text/css", ".js": "application/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".json": "application/json"}


def card_by_id(cid):
    return next((c for c in core.sweep(BOOKS)["cards"] if c["id"] == cid), None)


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send(self, obj, code=200):
        data = json.dumps(obj, default=str).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def body(self):
        n = int(self.headers.get("content-length") or 0)
        return json.loads(self.rfile.read(n) or b"{}")

    def do_GET(self):
        p = self.path.split("?")[0]
        if p == "/api/home":
            res = core.sweep(BOOKS)
            res.update(company=BOOKS.d["company"], people=BOOKS.d["people"], runway=core.runway(BOOKS),
                       mode={"claude": llm.enabled(), "seapoint_mcp": bool(llm.MCP_URL), "model": llm.MODEL})
            return self.send(res)
        if p == "/api/close":
            return self.send(core.close_checklist(BOOKS))
        if p == "/api/cash":
            return self.send({"runway": core.runway(BOOKS), "burn": core.burn(BOOKS), "cash": core.cash(BOOKS), "accounts": BOOKS.d["accounts"],
                              "entities": BOOKS.d["entities"], "variance": core.variance(BOOKS)})
        if p == "/api/audit":
            return self.send(BOOKS.audit)
        f = os.path.normpath(os.path.join(WEB, "index.html" if p == "/" else p.lstrip("/")))
        if f.startswith(WEB) and os.path.isfile(f):
            data = open(f, "rb").read()
            self.send_response(200)
            self.send_header("content-type", TYPES.get(os.path.splitext(f)[1], "application/octet-stream"))
            self.end_headers()
            return self.wfile.write(data)
        self.send({"error": "not found"}, 404)

    def do_POST(self):
        p, q = self.path, self.body()
        if p == "/api/act":
            c = card_by_id(q["card"])
            if not c:
                return self.send({"status": "gone"}, 404)
            return self.send(core.execute(BOOKS, c, q.get("approver", "p_founder"), q.get("payload")))
        if p == "/api/snooze":
            core.snooze(BOOKS, q["card"], q.get("reason", "Not now"))
            return self.send({"ok": True})
        if p == "/api/ask":
            return self.send(llm.ask(BOOKS, q["q"], q.get("history")))
        if p == "/api/whatif":
            return self.send({"before": core.runway(BOOKS), "after": core.runway(BOOKS, q.get("extra_monthly", 0), q.get("one_off", 0))})
        if p == "/api/board":
            return self.send(llm.board_pack(BOOKS))
        if p == "/api/tool":
            return self.send(llm.run_tool(BOOKS, q["name"], q.get("args") or {}))
        if p == "/api/card":
            return self.send(card_by_id(q["card"]) or {"error": "no such card"})
        if p == "/api/reset":
            BOOKS.reset()
            return self.send({"ok": True})
        self.send({"error": "not found"}, 404)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8787))
    print(f"Clearday on http://localhost:{port}  (Claude: {'on' if llm.enabled() else 'off - local answers'}, Seapoint MCP: {'on' if llm.MCP_URL else 'off - sandbox data'})")
    ThreadingHTTPServer(("0.0.0.0", port), H).serve_forever()

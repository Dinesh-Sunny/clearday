#!/bin/bash
# One-click start for Clearday (policy :8787, Deep Agent :2124, UI :3100). Logs in ./logs
cd "$(dirname "$0")"
mkdir -p logs
for p in 8787 2124 3100; do lsof -ti tcp:$p | xargs kill -9 2>/dev/null; done
python3 app/server.py > logs/policy.log 2>&1 &
cd web
[ -d node_modules ] || npm install
npx @langchain/langgraph-cli dev --port 2124 --no-browser > ../logs/agent.log 2>&1 &
npx next dev --turbopack -p 3100 > ../logs/web.log 2>&1 &
echo "Starting... (logs in clearday/logs)"
for i in $(seq 1 60); do curl -s -o /dev/null localhost:3100 && break; sleep 2; done
open http://localhost:3100
echo "Clearday running: UI http://localhost:3100 · fallback http://localhost:8787. Close this window to stop."
wait

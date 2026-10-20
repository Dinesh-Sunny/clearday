import { withAui } from "@assistant-ui/next";
import type { NextConfig } from "next";

const POLICY = process.env.POLICY_URL || "http://127.0.0.1:8787";

const nextConfig: NextConfig = {
  // The Clearday policy service (guard, sweeps, audit) is reachable from the UI at /policy/*
  async rewrites() {
    return [{ source: "/policy/:path*", destination: `${POLICY}/:path*` }];
  },
};

export default withAui(nextConfig);

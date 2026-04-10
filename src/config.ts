import "dotenv/config";

export type Environment = "test" | "production";

export interface EnvConfig {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function loadConfig(): Record<Environment, EnvConfig> {
  return {
    test: {
      baseUrl: (process.env.EMQX_TEST_URL ?? "").replace(/\/$/, ""),
      apiKey: process.env.EMQX_TEST_API_KEY ?? "",
      apiSecret: process.env.EMQX_TEST_API_SECRET ?? "",
    },
    production: {
      baseUrl: (process.env.EMQX_PROD_URL ?? "").replace(/\/$/, ""),
      apiKey: process.env.EMQX_PROD_API_KEY ?? "",
      apiSecret: process.env.EMQX_PROD_API_SECRET ?? "",
    },
  };
}

let _config: Record<Environment, EnvConfig> | null = null;

export function getConfig(env: Environment): EnvConfig {
  if (!_config) _config = loadConfig();
  const cfg = _config[env];
  if (!cfg.baseUrl) throw new Error(`EMQX_${env === "test" ? "TEST" : "PROD"}_URL is not set`);
  if (!cfg.apiKey) throw new Error(`EMQX_${env === "test" ? "TEST" : "PROD"}_API_KEY is not set`);
  if (!cfg.apiSecret) throw new Error(`EMQX_${env === "test" ? "TEST" : "PROD"}_API_SECRET is not set`);
  return cfg;
}

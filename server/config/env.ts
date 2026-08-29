import dotenv from "dotenv";
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3001", 10),

  // Active Provider API Keys
  TAVILY_API_KEY: process.env.TAVILY_API_KEY || "",
  BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY || "",
  OVERPASS_API_URL:
    process.env.OVERPASS_API_URL || "https://overpass-api.de/api/interpreter",

  // Database
  DATABASE_URL: process.env.DATABASE_URL || "",
  DIRECT_URL: process.env.DIRECT_URL || "",
};

export function isProviderConfigured(key: string): boolean {
  return typeof key === "string" && key.trim().length > 0;
}

import { ENV } from "./env";
import IORedis from "ioredis";
export const redis = new IORedis(ENV.REDIS_URL, { maxRetriesPerRequest: null });

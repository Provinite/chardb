import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";

const DATA_DIR = path.resolve(__dirname, "../../data");
const DEVIATIONS_DIR = path.join(DATA_DIR, "deviations");
const CONFIG_DIR = path.resolve(__dirname, "../../config");

export function getDataDir(): string {
  return DATA_DIR;
}

export function getDeviationsDir(): string {
  return DEVIATIONS_DIR;
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function readJson<T extends z.ZodTypeAny>(filePath: string, schema: T): Promise<z.output<T>> {
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  return schema.parse(parsed) as z.output<T>;
}

export async function readJsonRaw(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listJsonFiles(dir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(dir);
    return files.filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
}

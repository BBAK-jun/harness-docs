import { z } from "zod";

const optionalTrimmedStringSchema = z.string().trim().min(1).optional();

const runtimeEnvironmentSchema = z.object({
  HOST: z.string().trim().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4020),
  GITHUB_CLIENT_ID: optionalTrimmedStringSchema,
  GITHUB_CLIENT_SECRET: optionalTrimmedStringSchema,
  GITHUB_TOKEN: optionalTrimmedStringSchema,
  GITHUB_OAUTH_SCOPE: z.string().trim().min(1).default("read:user user:email"),
  HARNESS_DOCS_API_BASE_URL: z.url().optional(),
});

export type ApiRuntimeEnvironment = z.infer<typeof runtimeEnvironmentSchema>;

export function readApiRuntimeEnvironment(environment: NodeJS.ProcessEnv = process.env) {
  return runtimeEnvironmentSchema.parse(environment);
}

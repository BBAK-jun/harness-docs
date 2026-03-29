import type {
  SessionUserDto,
} from "@harness-docs/contracts";
import type {
  WorkspaceRepositoryValidationResult,
  WorkspaceRepositoryValidator,
} from "../../application/ports.ts";

interface GitHubRepositoryResponse {
  default_branch?: string;
  private?: boolean;
  full_name?: string;
}

export function createGitHubWorkspaceRepositoryValidator(options?: {
  apiBaseUrl?: string;
  token?: string;
}): WorkspaceRepositoryValidator {
  const apiBaseUrl = options?.apiBaseUrl ?? "https://api.github.com";
  const token = options?.token ?? process.env.GITHUB_TOKEN ?? "";

  function buildHeaders() {
    return {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async function fetchRepository(repositoryOwner: string, repositoryName: string) {
    return fetch(`${apiBaseUrl}/repos/${repositoryOwner}/${repositoryName}`, {
      headers: buildHeaders(),
    });
  }

  async function fetchBranch(
    repositoryOwner: string,
    repositoryName: string,
    defaultBranch: string,
  ) {
    return fetch(`${apiBaseUrl}/repos/${repositoryOwner}/${repositoryName}/branches/${defaultBranch}`, {
      headers: buildHeaders(),
    });
  }

  return {
    async validateWorkspaceRepository({
      repositoryOwner,
      repositoryName,
      defaultBranch,
      viewer,
    }: {
      repositoryOwner: string;
      repositoryName: string;
      defaultBranch: string;
      viewer: SessionUserDto;
    }): Promise<WorkspaceRepositoryValidationResult> {
      try {
        const repositoryResponse = await fetchRepository(repositoryOwner, repositoryName);

        if (repositoryResponse.status === 404) {
          return {
            ok: false,
            code: "github_repository_not_found",
            message: `GitHub repository '${repositoryOwner}/${repositoryName}' was not found.`,
            details: {
              repositoryOwner,
              repositoryName,
              viewerGithubLogin: viewer.githubLogin,
            },
          };
        }

        if (!repositoryResponse.ok) {
          return {
            ok: false,
            code: "github_repository_validation_failed",
            message: `GitHub repository lookup failed with ${repositoryResponse.status}.`,
            details: {
              repositoryOwner,
              repositoryName,
              defaultBranch,
              viewerGithubLogin: viewer.githubLogin,
            },
          };
        }

        const repository = (await repositoryResponse.json()) as GitHubRepositoryResponse;
        const branchResponse = await fetchBranch(repositoryOwner, repositoryName, defaultBranch);

        if (branchResponse.status === 404) {
          return {
            ok: false,
            code: "github_repository_branch_not_found",
            message: `Default branch '${defaultBranch}' was not found in '${repositoryOwner}/${repositoryName}'.`,
            details: {
              repositoryOwner,
              repositoryName,
              defaultBranch,
              repositoryDefaultBranch: repository.default_branch ?? null,
            },
          };
        }

        if (!branchResponse.ok) {
          return {
            ok: false,
            code: "github_repository_validation_failed",
            message: `GitHub branch lookup failed with ${branchResponse.status}.`,
            details: {
              repositoryOwner,
              repositoryName,
              defaultBranch,
            },
          };
        }

        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          code: "github_repository_validation_failed",
          message:
            error instanceof Error
              ? error.message
              : "GitHub repository validation failed.",
        };
      }
    },
  };
}

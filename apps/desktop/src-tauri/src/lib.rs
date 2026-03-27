use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::process::Command;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopShellMetadata {
    runtime: &'static str,
    platform: &'static str,
    app_name: &'static str,
    app_version: &'static str,
    version_control_provider: &'static str,
    authentication_provider: &'static str,
    supported_ai_providers: [&'static str; 2],
    editing_lock_timeout_minutes: u16,
    supports_outbound_webhooks: bool,
    supports_github_publish_automation: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GitHubIdentity {
    login: String,
    name: Option<String>,
    email: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GitHubAuthenticationSession {
    status: &'static str,
    user: Option<GitHubIdentity>,
    message: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GhAuthStatusResponse {
    hosts: HashMap<String, Vec<GhAuthHostEntry>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GhAuthHostEntry {
    state: String,
    active: bool,
    login: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AITaskExecutionInput {
    provider: String,
    prompt_label: String,
    prompt: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AITaskExecutionResult {
    provider: String,
    command: String,
    prompt_label: String,
    output: String,
    working_directory: String,
    started_at: String,
    completed_at: String,
    suggestion: Option<Value>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PublishExecutionInput {
    repository: PublishRepositoryBinding,
    publish_record: PublishRecordPayload,
    files: Vec<PublishRepositoryFile>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PublishRepositoryBinding {
    owner: String,
    name: String,
    default_branch: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PublishRepositoryFile {
    path: String,
    content: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PublishRecordPayload {
    publication: PublishAutomationPayload,
    stale_rationale: String,
    source: PublishSourcePayload,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PublishSourcePayload {
    label: String,
    change_summary: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PublishAutomationPayload {
    repository: PublishRepositoryMetadata,
    commit: PublishCommitMetadata,
    pull_request: PublishPullRequestMetadata,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PublishRepositoryMetadata {
    base_branch: String,
    branch_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PublishCommitMetadata {
    message: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PublishPullRequestMetadata {
    title: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PublishExecutionResult {
    repository: String,
    local_repo_path: String,
    branch_name: String,
    commit_sha: Option<String>,
    pull_request_number: Option<u64>,
    pull_request_url: Option<String>,
    committed_files: Vec<String>,
    started_at: String,
    completed_at: String,
}

fn now_rfc3339() -> String {
    Utc::now().to_rfc3339()
}

fn resolve_executable(env_var: &str, preferred_paths: &[&str], fallback: &str) -> String {
    if let Ok(path) = std::env::var(env_var) {
        if !path.trim().is_empty() {
            return path;
        }
    }

    for candidate in preferred_paths {
        if Path::new(candidate).exists() {
            return (*candidate).to_string();
        }
    }

    fallback.to_string()
}

fn run_command(command: &mut Command) -> Result<String, String> {
    let output = command
        .output()
        .map_err(|error| format!("failed to execute command: {error}"))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();

        if stdout.is_empty() {
            return Ok(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }

        return Ok(stdout);
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();

    Err(if !stderr.is_empty() {
        stderr
    } else if !stdout.is_empty() {
        stdout
    } else {
        format!("command exited with status {}", output.status)
    })
}

fn ensure_clean_relative_path(raw_path: &str) -> Result<PathBuf, String> {
    let candidate = Path::new(raw_path);

    if candidate.is_absolute() {
        return Err(format!("absolute paths are not allowed: {raw_path}"));
    }

    let mut cleaned = PathBuf::new();

    for component in candidate.components() {
        match component {
            Component::Normal(segment) => cleaned.push(segment),
            Component::CurDir => continue,
            Component::ParentDir | Component::Prefix(_) | Component::RootDir => {
                return Err(format!("unsafe repository path: {raw_path}"));
            }
        }
    }

    if cleaned.as_os_str().is_empty() {
        return Err("repository path may not be empty".to_string());
    }

    Ok(cleaned)
}

fn parse_pull_request_number(url: &str) -> Option<u64> {
    url.rsplit('/')
        .next()
        .and_then(|value| value.parse::<u64>().ok())
}

fn gh_binary() -> String {
    resolve_executable("HARNESS_DOCS_GH_PATH", &["/opt/homebrew/bin/gh"], "gh")
}

fn codex_binary() -> String {
    resolve_executable(
        "HARNESS_DOCS_CODEX_PATH",
        &["/opt/homebrew/bin/codex"],
        "codex",
    )
}

fn claude_binary() -> String {
    resolve_executable(
        "HARNESS_DOCS_CLAUDE_PATH",
        &["/Applications/cmux.app/Contents/Resources/bin/claude"],
        "claude",
    )
}

fn git_binary() -> String {
    resolve_executable(
        "HARNESS_DOCS_GIT_PATH",
        &["/usr/bin/git", "/opt/homebrew/bin/git"],
        "git",
    )
}

fn get_github_identity() -> Result<Option<GitHubIdentity>, String> {
    let gh = gh_binary();
    let status_json = run_command(
        Command::new(&gh).args([
            "auth",
            "status",
            "--json",
            "hosts",
            "--active",
            "--hostname",
            "github.com",
        ]),
    )?;

    let parsed: GhAuthStatusResponse =
        serde_json::from_str(&status_json).map_err(|error| format!("invalid gh auth status payload: {error}"))?;
    let active_host = parsed
        .hosts
        .get("github.com")
        .and_then(|entries| entries.iter().find(|entry| entry.active));

    let Some(active_host) = active_host else {
        return Ok(None);
    };

    if active_host.state == "error" || active_host.login.is_none() {
        return Ok(None);
    }

    let login = active_host.login.clone().unwrap_or_default();
    let user_profile_json = run_command(Command::new(&gh).args(["api", "user"]))?;
    let user_profile: Value =
        serde_json::from_str(&user_profile_json).map_err(|error| format!("invalid gh user payload: {error}"))?;

    let email = run_command(Command::new(&gh).args(["api", "user/emails"])).ok().and_then(|raw| {
        let emails: Value = serde_json::from_str(&raw).ok()?;
        emails.as_array().and_then(|items| {
            items.iter().find_map(|item| {
                if item.get("primary").and_then(Value::as_bool).unwrap_or(false) {
                    return item.get("email").and_then(Value::as_str).map(str::to_string);
                }

                None
            })
        })
    });

    Ok(Some(GitHubIdentity {
        login,
        name: user_profile
            .get("name")
            .and_then(Value::as_str)
            .map(str::to_string),
        email,
    }))
}

#[tauri::command]
fn get_desktop_shell_metadata() -> DesktopShellMetadata {
    DesktopShellMetadata {
        runtime: "tauri",
        platform: std::env::consts::OS,
        app_name: "Harness Docs",
        app_version: env!("CARGO_PKG_VERSION"),
        version_control_provider: "github",
        authentication_provider: "github_oauth",
        supported_ai_providers: ["Codex", "Claude"],
        editing_lock_timeout_minutes: 30,
        supports_outbound_webhooks: true,
        supports_github_publish_automation: true,
    }
}

#[tauri::command]
fn get_github_authentication_session() -> Result<GitHubAuthenticationSession, String> {
    let identity = get_github_identity()?;

    Ok(match identity {
        Some(user) => GitHubAuthenticationSession {
            status: "authenticated",
            user: Some(user),
            message: None,
        },
        None => GitHubAuthenticationSession {
            status: "signed_out",
            user: None,
            message: Some(
                "GitHub CLI is not authenticated. Run Sign in with GitHub to restore access."
                    .to_string(),
            ),
        },
    })
}

#[tauri::command]
fn start_github_sign_in() -> Result<GitHubAuthenticationSession, String> {
    let gh = gh_binary();
    run_command(Command::new(&gh).args([
        "auth",
        "login",
        "--hostname",
        "github.com",
        "--git-protocol",
        "https",
        "--skip-ssh-key",
        "--web",
        "--clipboard",
    ]))?;

    get_github_authentication_session()
}

#[tauri::command]
fn sign_out_github() -> Result<GitHubAuthenticationSession, String> {
    let gh = gh_binary();
    let current = get_github_identity()?;

    if let Some(identity) = current {
        run_command(Command::new(&gh).args([
            "auth",
            "logout",
            "--hostname",
            "github.com",
            "--user",
            identity.login.as_str(),
        ]))?;
    }

    Ok(GitHubAuthenticationSession {
        status: "signed_out",
        user: None,
        message: None,
    })
}

#[tauri::command]
fn run_ai_task(input: AITaskExecutionInput) -> Result<AITaskExecutionResult, String> {
    let started_at = now_rfc3339();
    let working_directory = std::env::temp_dir()
        .join("harness-docs-ai")
        .join(format!(
            "{}-{}",
            input.provider.to_lowercase(),
            Utc::now().timestamp_millis()
        ));

    fs::create_dir_all(&working_directory)
        .map_err(|error| format!("failed to create AI working directory: {error}"))?;

    let result = match input.provider.as_str() {
        "Codex" => {
            let codex = codex_binary();
            let output_path = working_directory.join("codex-last-message.txt");

            run_command(
                Command::new(&codex)
                    .current_dir(&working_directory)
                    .args([
                        "exec",
                        "--skip-git-repo-check",
                        "--sandbox",
                        "read-only",
                        "--output-last-message",
                    ])
                    .arg(&output_path)
                    .arg(&input.prompt),
            )?;

            let output = fs::read_to_string(&output_path)
                .map_err(|error| format!("failed to read Codex output: {error}"))?;

            AITaskExecutionResult {
                provider: input.provider,
                command: codex,
                prompt_label: input.prompt_label,
                output,
                working_directory: working_directory.display().to_string(),
                started_at,
                completed_at: now_rfc3339(),
                suggestion: None,
            }
        }
        "Claude" => {
            let claude = claude_binary();
            let output = run_command(
                Command::new(&claude)
                    .current_dir(&working_directory)
                    .args(["-p", "--output-format", "text"])
                    .arg(&input.prompt),
            )?;

            AITaskExecutionResult {
                provider: input.provider,
                command: claude,
                prompt_label: input.prompt_label,
                output,
                working_directory: working_directory.display().to_string(),
                started_at,
                completed_at: now_rfc3339(),
                suggestion: None,
            }
        }
        _ => return Err(format!("unsupported AI provider: {}", input.provider)),
    };

    Ok(result)
}

#[tauri::command]
fn execute_github_publish(input: PublishExecutionInput) -> Result<PublishExecutionResult, String> {
    let started_at = now_rfc3339();
    let gh = gh_binary();
    let git = git_binary();
    let repository_name = format!("{}/{}", input.repository.owner, input.repository.name);
    let repository_root = std::env::temp_dir()
        .join("harness-docs-github")
        .join(format!("{}__{}", input.repository.owner, input.repository.name));

    if !repository_root.join(".git").exists() {
        if let Some(parent) = repository_root.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("failed to prepare repository cache directory: {error}"))?;
        }

        run_command(
            Command::new(&gh)
                .args(["repo", "clone", repository_name.as_str()])
                .arg(&repository_root),
        )?;
    }

    run_command(Command::new(&git).args([
        "-C",
        repository_root.to_string_lossy().as_ref(),
        "fetch",
        "origin",
    ]))?;

    let base_branch = if input.publish_record.publication.repository.base_branch.is_empty() {
        input.repository.default_branch.as_str()
    } else {
        input.publish_record
            .publication
            .repository
            .base_branch
            .as_str()
    };
    let branch_name = input
        .publish_record
        .publication
        .repository
        .branch_name
        .as_str();

    run_command(Command::new(&git).args([
        "-C",
        repository_root.to_string_lossy().as_ref(),
        "checkout",
        "-B",
        branch_name,
        &format!("origin/{base_branch}"),
    ]))?;

    for file in &input.files {
        let relative_path = ensure_clean_relative_path(&file.path)?;
        let absolute_path = repository_root.join(relative_path);

        if let Some(parent) = absolute_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("failed to create repository directories: {error}"))?;
        }

        fs::write(&absolute_path, &file.content)
            .map_err(|error| format!("failed to write repository file {}: {error}", file.path))?;
    }

    run_command(Command::new(&git).args([
        "-C",
        repository_root.to_string_lossy().as_ref(),
        "add",
        "--all",
    ]))?;

    let has_changes = Command::new(&git)
        .args([
            "-C",
            repository_root.to_string_lossy().as_ref(),
            "diff",
            "--cached",
            "--quiet",
            "--exit-code",
        ])
        .status()
        .map_err(|error| format!("failed to inspect staged publish changes: {error}"))?
        .success()
        == false;

    if !has_changes {
        return Err("No publishable file changes were detected for the current publish batch.".to_string());
    }

    run_command(Command::new(&git).args([
        "-C",
        repository_root.to_string_lossy().as_ref(),
        "commit",
        "-m",
        input.publish_record.publication.commit.message.as_str(),
    ]))?;

    let commit_sha = run_command(Command::new(&git).args([
        "-C",
        repository_root.to_string_lossy().as_ref(),
        "rev-parse",
        "HEAD",
    ]))?;

    run_command(Command::new(&git).args([
        "-C",
        repository_root.to_string_lossy().as_ref(),
        "push",
        "-u",
        "origin",
        branch_name,
        "--force-with-lease",
    ]))?;

    let pr_body = format!(
        "{}\n\n{}\n\n{}",
        input.publish_record.publication.pull_request.title,
        input.publish_record.source.change_summary,
        input.publish_record.stale_rationale
    );
    let pr_url = run_command(
        Command::new(&gh)
            .args([
                "pr",
                "create",
                "--repo",
                repository_name.as_str(),
                "--base",
                base_branch,
                "--head",
                branch_name,
                "--title",
                input.publish_record.publication.pull_request.title.as_str(),
                "--body",
            ])
            .arg(pr_body),
    )?;

    Ok(PublishExecutionResult {
        repository: repository_name,
        local_repo_path: repository_root.display().to_string(),
        branch_name: branch_name.to_string(),
        commit_sha: Some(commit_sha),
        pull_request_number: parse_pull_request_number(&pr_url),
        pull_request_url: Some(pr_url),
        committed_files: input.files.iter().map(|file| file.path.clone()).collect(),
        started_at,
        completed_at: now_rfc3339(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_desktop_shell_metadata,
            get_github_authentication_session,
            start_github_sign_in,
            sign_out_github,
            run_ai_task,
            execute_github_publish
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

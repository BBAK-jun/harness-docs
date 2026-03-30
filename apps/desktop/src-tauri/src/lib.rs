use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::ffi::OsString;
use std::fs;
use std::io::{BufRead, BufReader, Read};
use std::path::{Component, Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::thread;
use std::time::Duration;
use tauri::Emitter;

const AI_TASK_EVENT_NAME: &str = "ai-task-event";
const DEFAULT_AI_TASK_PROBE_INTERVAL_MS: u64 = 750;
const CODEX_OUTPUT_STABILITY_POLL_MS: u64 = 200;
const CODEX_PROCESS_GRACE_PERIOD_MS: u64 = 1500;

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
    ai_provider_statuses: HashMap<String, AIProviderRuntimeStatus>,
    ai_task_probe_interval_ms: u64,
    editing_lock_timeout_minutes: u16,
    supports_outbound_webhooks: bool,
    supports_github_publish_automation: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AIProviderRuntimeStatus {
    status: &'static str,
    command: String,
    detail: Option<String>,
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
struct ClaudeAuthStatus {
    logged_in: bool,
    auth_method: String,
    api_provider: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AITaskExecutionInput {
    provider: String,
    prompt_label: String,
    prompt: String,
}

#[derive(Clone, Serialize)]
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

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AITaskExecutionHandle {
    task_id: String,
    provider: String,
    command: String,
    prompt_label: String,
    working_directory: String,
    started_at: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "type")]
enum AITaskExecutionEvent {
    Output {
        task_id: String,
        stream: &'static str,
        chunk: String,
    },
    Completed {
        task_id: String,
        result: AITaskExecutionResult,
    },
    Failed {
        task_id: String,
        error: String,
        completed_at: String,
    },
    Cancelled {
        task_id: String,
        completed_at: String,
    },
}

#[derive(Clone)]
struct RunningAITask {
    child: Arc<Mutex<Child>>,
    cancelled: Arc<AtomicBool>,
}

#[derive(Clone, Default)]
struct AITaskManager {
    tasks: Arc<Mutex<HashMap<String, RunningAITask>>>,
}

#[derive(Clone, Default)]
struct ClaudeStreamSummary {
    final_result: Option<String>,
    error: Option<String>,
}

#[derive(Clone, Default)]
struct CodexStreamSummary {
    final_result: Option<String>,
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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AITaskResultProbeInput {
    task_id: String,
    provider: String,
    command: String,
    prompt_label: String,
    working_directory: String,
    started_at: String,
}

fn now_rfc3339() -> String {
    Utc::now().to_rfc3339()
}

fn ai_task_root_directory() -> PathBuf {
    std::env::temp_dir().join("harness-docs-ai")
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

fn ai_task_probe_interval_ms() -> u64 {
    std::env::var("HARNESS_DOCS_AI_TASK_PROBE_INTERVAL_MS")
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .filter(|value| (100..=10_000).contains(value))
        .unwrap_or(DEFAULT_AI_TASK_PROBE_INTERVAL_MS)
}

fn merged_shell_path() -> String {
    let mut paths = std::env::var_os("PATH")
        .into_iter()
        .flat_map(|value| std::env::split_paths(&value).collect::<Vec<_>>())
        .collect::<Vec<_>>();

    for fallback in [
        "/opt/homebrew/bin",
        "/usr/local/bin",
        "/usr/bin",
        "/bin",
        "/usr/sbin",
        "/sbin",
    ] {
        let candidate = PathBuf::from(fallback);

        if !paths.iter().any(|path| path == &candidate) {
            paths.push(candidate);
        }
    }

    std::env::join_paths(paths)
        .unwrap_or_else(|_| {
            OsString::from("/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin")
        })
        .to_string_lossy()
        .to_string()
}

fn configure_command(command: &mut Command) -> &mut Command {
    command.env("PATH", merged_shell_path());

    for key in [
        "HOME",
        "USER",
        "LOGNAME",
        "SHELL",
        "TMPDIR",
        "LANG",
        "LC_ALL",
        "LC_CTYPE",
        "TERM",
        "TERM_PROGRAM",
        "SSH_AUTH_SOCK",
        "XDG_CONFIG_HOME",
        "XDG_STATE_HOME",
        "XDG_DATA_HOME",
        "XDG_CACHE_HOME",
        "CMUX_SOCKET_PATH",
        "CMUX_SURFACE_ID",
        "CMUX_HOOKS_ENABLED",
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "NO_PROXY",
    ] {
        if let Some(value) = std::env::var_os(key) {
            command.env(key, value);
        }
    }

    command
}

struct CommandCapture {
    status: std::process::ExitStatus,
    stdout: String,
    stderr: String,
}

fn capture_command(command: &mut Command) -> Result<CommandCapture, String> {
    let output = configure_command(command)
        .output()
        .map_err(|error| format!("failed to execute command: {error}"))?;

    Ok(CommandCapture {
        status: output.status,
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

fn run_command(command: &mut Command) -> Result<String, String> {
    let output = capture_command(command)?;

    if output.status.success() {
        let stdout = output.stdout.trim().to_string();

        if stdout.is_empty() {
            return Ok(output.stderr.trim().to_string());
        }

        return Ok(stdout);
    }

    let stderr = output.stderr.trim().to_string();
    let stdout = output.stdout.trim().to_string();

    Err(if !stderr.is_empty() {
        stderr
    } else if !stdout.is_empty() {
        stdout
    } else {
        format!("command exited with status {}", output.status)
    })
}

fn emit_ai_task_event(app_handle: &tauri::AppHandle, event: AITaskExecutionEvent) {
    let _ = app_handle.emit(AI_TASK_EVENT_NAME, event);
}

fn build_ai_task_execution_result(
    provider: String,
    command: String,
    prompt_label: String,
    output: String,
    working_directory: String,
    started_at: String,
    completed_at: String,
) -> AITaskExecutionResult {
    AITaskExecutionResult {
        provider,
        command,
        prompt_label,
        output,
        working_directory,
        started_at,
        completed_at,
        suggestion: None,
    }
}

fn emit_ai_task_completed_if_pending(
    app_handle: &tauri::AppHandle,
    task_id: &str,
    result: AITaskExecutionResult,
    completion_emitted: &Arc<AtomicBool>,
) -> bool {
    if completion_emitted.swap(true, Ordering::Relaxed) {
        return false;
    }

    emit_ai_task_event(
        app_handle,
        AITaskExecutionEvent::Completed {
            task_id: task_id.to_string(),
            result,
        },
    );

    true
}

fn normalize_command_success_output(stdout: &str, stderr: &str) -> String {
    let trimmed_stdout = stdout.trim().to_string();

    if trimmed_stdout.is_empty() {
        return stderr.trim().to_string();
    }

    trimmed_stdout
}

fn normalize_command_error_output(
    stderr: &str,
    stdout: &str,
    status: &std::process::ExitStatus,
) -> String {
    let trimmed_stderr = stderr.trim().to_string();

    if !trimmed_stderr.is_empty() {
        return trimmed_stderr;
    }

    let trimmed_stdout = stdout.trim().to_string();

    if !trimmed_stdout.is_empty() {
        return trimmed_stdout;
    }

    format!("command exited with status {status}")
}

fn read_buffered_output(output: &Arc<Mutex<String>>) -> String {
    output.lock().map(|value| value.clone()).unwrap_or_default()
}

fn strip_provider_output_noise(provider: &str, text: &str) -> String {
    let mut sanitized = text.to_string();

    if provider == "Codex" {
        for needle in [
            "WARNING: proceeding, even though we could not update PATH: Operation not permitted (os error 1)\n",
            "WARNING: proceeding, even though we could not update PATH: Operation not permitted (os error 1)",
        ] {
            sanitized = sanitized.replace(needle, "");
        }
    }

    sanitized
}

fn push_output_chunk(
    sink: &Arc<Mutex<String>>,
    app_handle: &tauri::AppHandle,
    task_id: &str,
    provider: &str,
    stream: &'static str,
    chunk: String,
) {
    let chunk = strip_provider_output_noise(provider, &chunk);

    if chunk.is_empty() {
        return;
    }

    if let Ok(mut collected) = sink.lock() {
        collected.push_str(&chunk);
    }

    emit_ai_task_event(
        app_handle,
        AITaskExecutionEvent::Output {
            task_id: task_id.to_string(),
            stream,
            chunk,
        },
    );
}

fn flush_utf8_chunks(
    pending: &mut Vec<u8>,
    sink: &Arc<Mutex<String>>,
    app_handle: &tauri::AppHandle,
    task_id: &str,
    provider: &str,
    stream: &'static str,
) {
    loop {
        match std::str::from_utf8(pending) {
            Ok(valid) => {
                if !valid.is_empty() {
                    push_output_chunk(
                        sink,
                        app_handle,
                        task_id,
                        provider,
                        stream,
                        valid.to_string(),
                    );
                    pending.clear();
                }

                return;
            }
            Err(error) => {
                let valid_up_to = error.valid_up_to();

                if valid_up_to > 0 {
                    let valid_bytes = pending.drain(..valid_up_to).collect::<Vec<_>>();
                    let valid = String::from_utf8(valid_bytes).unwrap_or_default();
                    push_output_chunk(sink, app_handle, task_id, provider, stream, valid);
                    continue;
                }

                if let Some(error_len) = error.error_len() {
                    let invalid_bytes = pending.drain(..error_len).collect::<Vec<_>>();
                    let lossy = String::from_utf8_lossy(&invalid_bytes).to_string();
                    push_output_chunk(sink, app_handle, task_id, provider, stream, lossy);
                    continue;
                }

                return;
            }
        }
    }
}

fn spawn_output_reader<R: Read + Send + 'static>(
    reader: R,
    sink: Arc<Mutex<String>>,
    app_handle: tauri::AppHandle,
    task_id: String,
    provider: String,
    stream: &'static str,
) -> thread::JoinHandle<()> {
    thread::spawn(move || {
        let mut reader = reader;
        let mut buffer = [0_u8; 2048];
        let mut pending = Vec::new();

        loop {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(read) => {
                    pending.extend_from_slice(&buffer[..read]);
                    flush_utf8_chunks(
                        &mut pending,
                        &sink,
                        &app_handle,
                        &task_id,
                        &provider,
                        stream,
                    );
                }
                Err(_) => break,
            }
        }

        if !pending.is_empty() {
            push_output_chunk(
                &sink,
                &app_handle,
                &task_id,
                &provider,
                stream,
                String::from_utf8_lossy(&pending).to_string(),
            );
        }
    })
}

enum ClaudeStreamLineAction {
    Ignore,
    AppendText(String),
    SetFinalResult(String),
    SetError(String),
}

enum CodexStreamLineAction {
    Ignore,
    EmitWarning(String),
    SetFinalResult(String),
}

fn extract_claude_message_text(message: &Value) -> Option<String> {
    let content = message.get("content")?.as_array()?;
    let text = content
        .iter()
        .filter(|block| {
            block
                .get("type")
                .and_then(Value::as_str)
                .is_some_and(|kind| kind == "text")
        })
        .filter_map(|block| block.get("text").and_then(Value::as_str))
        .collect::<Vec<_>>()
        .join("");

    if text.is_empty() {
        None
    } else {
        Some(text)
    }
}

fn parse_claude_stream_line(line: &str) -> ClaudeStreamLineAction {
    let payload: Value = match serde_json::from_str(line) {
        Ok(value) => value,
        Err(_) => {
            return if line.trim().is_empty() || line.trim_start().starts_with('{') {
                ClaudeStreamLineAction::Ignore
            } else {
                ClaudeStreamLineAction::AppendText(line.to_string())
            };
        }
    };

    match payload.get("type").and_then(Value::as_str) {
        Some("stream_event") => match payload
            .get("event")
            .and_then(|event| event.get("type"))
            .and_then(Value::as_str)
        {
            Some("content_block_start") => payload
                .get("event")
                .and_then(|event| event.get("content_block"))
                .filter(|block| {
                    block
                        .get("type")
                        .and_then(Value::as_str)
                        .is_some_and(|kind| kind == "text")
                })
                .and_then(|block| block.get("text"))
                .and_then(Value::as_str)
                .filter(|text| !text.is_empty())
                .map(|text| ClaudeStreamLineAction::AppendText(text.to_string()))
                .unwrap_or(ClaudeStreamLineAction::Ignore),
            Some("content_block_delta") => payload
                .get("event")
                .and_then(|event| event.get("delta"))
                .filter(|delta| {
                    delta
                        .get("type")
                        .and_then(Value::as_str)
                        .is_some_and(|kind| kind == "text_delta")
                })
                .and_then(|delta| delta.get("text"))
                .and_then(Value::as_str)
                .filter(|text| !text.is_empty())
                .map(|text| ClaudeStreamLineAction::AppendText(text.to_string()))
                .unwrap_or(ClaudeStreamLineAction::Ignore),
            _ => ClaudeStreamLineAction::Ignore,
        },
        Some("assistant") => payload
            .get("message")
            .and_then(extract_claude_message_text)
            .map(ClaudeStreamLineAction::SetFinalResult)
            .unwrap_or(ClaudeStreamLineAction::Ignore),
        Some("result") => {
            let result_text = payload
                .get("result")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|text| !text.is_empty())
                .map(str::to_string);
            let is_error = payload
                .get("is_error")
                .and_then(Value::as_bool)
                .unwrap_or(false);

            if is_error {
                return result_text
                    .or_else(|| {
                        payload
                            .get("subtype")
                            .and_then(Value::as_str)
                            .map(|subtype| format!("Claude CLI finished with {subtype}."))
                    })
                    .map(ClaudeStreamLineAction::SetError)
                    .unwrap_or(ClaudeStreamLineAction::Ignore);
            }

            result_text
                .map(ClaudeStreamLineAction::SetFinalResult)
                .unwrap_or(ClaudeStreamLineAction::Ignore)
        }
        _ => ClaudeStreamLineAction::Ignore,
    }
}

fn spawn_claude_output_reader<R: Read + Send + 'static>(
    reader: R,
    sink: Arc<Mutex<String>>,
    summary: Arc<Mutex<ClaudeStreamSummary>>,
    app_handle: tauri::AppHandle,
    task_id: String,
) -> thread::JoinHandle<()> {
    thread::spawn(move || {
        let mut reader = BufReader::new(reader);
        let mut line = Vec::new();

        loop {
            line.clear();

            match reader.read_until(b'\n', &mut line) {
                Ok(0) => break,
                Ok(_) => {
                    let raw_line = String::from_utf8_lossy(&line);
                    let trimmed = raw_line.trim_end_matches(['\r', '\n']);

                    match parse_claude_stream_line(trimmed) {
                        ClaudeStreamLineAction::Ignore => {}
                        ClaudeStreamLineAction::AppendText(text) => push_output_chunk(
                            &sink,
                            &app_handle,
                            &task_id,
                            "Claude",
                            "stdout",
                            text,
                        ),
                        ClaudeStreamLineAction::SetFinalResult(result) => {
                            if let Ok(mut value) = summary.lock() {
                                value.final_result =
                                    Some(strip_provider_output_noise("Claude", result.trim()));
                            }
                        }
                        ClaudeStreamLineAction::SetError(error) => {
                            if let Ok(mut value) = summary.lock() {
                                value.error = Some(sanitize_provider_detail("Claude", &error));
                            }
                        }
                    }
                }
                Err(_) => break,
            }
        }
    })
}

fn parse_codex_stream_line(line: &str) -> CodexStreamLineAction {
    let payload: Value = match serde_json::from_str(line) {
        Ok(value) => value,
        Err(_) => return CodexStreamLineAction::Ignore,
    };

    match payload.get("type").and_then(Value::as_str) {
        Some("item.completed") => payload
            .get("item")
            .filter(|item| {
                item.get("type")
                    .and_then(Value::as_str)
                    .is_some_and(|kind| kind == "agent_message")
            })
            .and_then(|item| item.get("text"))
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|text| !text.is_empty())
            .map(|text| CodexStreamLineAction::SetFinalResult(text.to_string()))
            .unwrap_or(CodexStreamLineAction::Ignore),
        Some("error") => payload
            .get("message")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|text| !text.is_empty())
            .map(|text| CodexStreamLineAction::EmitWarning(text.to_string()))
            .unwrap_or(CodexStreamLineAction::Ignore),
        _ => CodexStreamLineAction::Ignore,
    }
}

#[allow(clippy::too_many_arguments)]
fn spawn_codex_output_reader<R: Read + Send + 'static>(
    reader: R,
    stderr_sink: Arc<Mutex<String>>,
    summary: Arc<Mutex<CodexStreamSummary>>,
    app_handle: tauri::AppHandle,
    task_id: String,
    command_name: String,
    prompt_label: String,
    working_directory: String,
    started_at: String,
    completion_emitted: Arc<AtomicBool>,
    process_finished: Arc<AtomicBool>,
    child: Arc<Mutex<Child>>,
) -> thread::JoinHandle<()> {
    thread::spawn(move || {
        let mut reader = BufReader::new(reader);
        let mut line = Vec::new();

        loop {
            line.clear();

            match reader.read_until(b'\n', &mut line) {
                Ok(0) => break,
                Ok(_) => {
                    let raw_line = String::from_utf8_lossy(&line);
                    let trimmed = raw_line.trim_end_matches(['\r', '\n']);

                    match parse_codex_stream_line(trimmed) {
                        CodexStreamLineAction::Ignore => {}
                        CodexStreamLineAction::EmitWarning(message) => push_output_chunk(
                            &stderr_sink,
                            &app_handle,
                            &task_id,
                            "Codex",
                            "stderr",
                            format!("{message}\n"),
                        ),
                        CodexStreamLineAction::SetFinalResult(result) => {
                            let sanitized_result =
                                strip_provider_output_noise("Codex", result.trim());

                            if let Ok(mut value) = summary.lock() {
                                value.final_result = Some(sanitized_result.clone());
                            }

                            let emitted = emit_ai_task_completed_if_pending(
                                &app_handle,
                                &task_id,
                                build_ai_task_execution_result(
                                    "Codex".to_string(),
                                    command_name.clone(),
                                    prompt_label.clone(),
                                    sanitized_result,
                                    working_directory.clone(),
                                    started_at.clone(),
                                    now_rfc3339(),
                                ),
                                &completion_emitted,
                            );

                            if emitted {
                                thread::sleep(Duration::from_millis(CODEX_PROCESS_GRACE_PERIOD_MS));

                                if process_finished.load(Ordering::Relaxed) {
                                    return;
                                }

                                if let Ok(mut child) = child.lock() {
                                    if matches!(child.try_wait(), Ok(None)) {
                                        let _ = child.kill();
                                    }
                                }
                            }
                        }
                    }
                }
                Err(_) => break,
            }
        }
    })
}

fn spawn_codex_output_watcher(
    output_path: PathBuf,
    app_handle: tauri::AppHandle,
    task_id: String,
    command_name: String,
    prompt_label: String,
    working_directory: String,
    started_at: String,
    completion_emitted: Arc<AtomicBool>,
    process_finished: Arc<AtomicBool>,
    child: Arc<Mutex<Child>>,
) -> thread::JoinHandle<()> {
    thread::spawn(move || {
        let mut last_seen_output: Option<String> = None;
        let mut stable_reads = 0_u8;

        loop {
            if completion_emitted.load(Ordering::Relaxed)
                || process_finished.load(Ordering::Relaxed)
            {
                return;
            }

            if let Ok(content) = fs::read_to_string(&output_path) {
                let output = strip_provider_output_noise("Codex", content.trim())
                    .trim()
                    .to_string();

                if !output.is_empty() {
                    if last_seen_output.as_deref() == Some(output.as_str()) {
                        stable_reads = stable_reads.saturating_add(1);
                    } else {
                        last_seen_output = Some(output.clone());
                        stable_reads = 1;
                    }

                    if stable_reads >= 2 {
                        let completed_at = now_rfc3339();
                        let emitted = emit_ai_task_completed_if_pending(
                            &app_handle,
                            &task_id,
                            build_ai_task_execution_result(
                                "Codex".to_string(),
                                command_name.clone(),
                                prompt_label.clone(),
                                output,
                                working_directory.clone(),
                                started_at.clone(),
                                completed_at,
                            ),
                            &completion_emitted,
                        );

                        if emitted {
                            thread::sleep(Duration::from_millis(CODEX_PROCESS_GRACE_PERIOD_MS));

                            if process_finished.load(Ordering::Relaxed) {
                                return;
                            }

                            if let Ok(mut child) = child.lock() {
                                if matches!(child.try_wait(), Ok(None)) {
                                    let _ = child.kill();
                                }
                            }
                        }

                        return;
                    }
                }
            }

            thread::sleep(Duration::from_millis(CODEX_OUTPUT_STABILITY_POLL_MS));
        }
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

fn ensure_safe_ai_task_working_directory(raw_path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(raw_path);
    let ai_task_root = ai_task_root_directory();

    if path.starts_with(&ai_task_root) {
        Ok(path)
    } else {
        Err(format!("unsafe AI task working directory: {raw_path}"))
    }
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
        &[
            "/opt/homebrew/bin/claude",
            "/Applications/cmux.app/Contents/Resources/bin/claude",
        ],
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

fn sanitize_provider_detail(provider: &str, detail: &str) -> String {
    let mut lines = detail
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .filter(|line| {
            !(*line == "WARNING: proceeding, even though we could not update PATH: Operation not permitted (os error 1)"
                && provider == "Codex")
        })
        .collect::<Vec<_>>();

    if lines.is_empty() {
        return String::new();
    }

    lines.dedup();
    lines.join(" · ")
}

fn format_provider_probe_detail(provider: &str, version: &str, auth: &str) -> Option<String> {
    let detail = [version, auth]
        .into_iter()
        .map(|value| sanitize_provider_detail(provider, value))
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>()
        .join(" · ");

    if detail.is_empty() {
        None
    } else {
        Some(detail)
    }
}

fn probe_codex_auth(command: &str) -> Result<String, String> {
    let capture = capture_command(Command::new(command).args(["login", "status"]))?;
    let detail =
        sanitize_provider_detail("Codex", &format!("{}\n{}", capture.stdout, capture.stderr));

    if capture.status.success() {
        Ok(if detail.is_empty() {
            "Codex CLI 인증이 준비되었습니다.".to_string()
        } else {
            detail
        })
    } else {
        Err(if detail.is_empty() {
            "Codex CLI가 설치되어 있지만 로그인 상태를 확인하지 못했습니다. `codex login`을 확인하세요."
                .to_string()
        } else {
            detail
        })
    }
}

fn probe_claude_auth(command: &str) -> Result<String, String> {
    let capture = capture_command(Command::new(command).args(["auth", "status", "--json"]))?;
    let payload = if capture.stdout.trim().is_empty() {
        capture.stderr.trim()
    } else {
        capture.stdout.trim()
    };
    let raw_detail =
        sanitize_provider_detail("Claude", &format!("{}\n{}", capture.stdout, capture.stderr));
    let parsed: ClaudeAuthStatus = serde_json::from_str(payload).map_err(|error| {
        if raw_detail.is_empty() {
            format!("invalid Claude auth status payload: {error}")
        } else {
            raw_detail
        }
    })?;

    if parsed.logged_in {
        Ok(format!(
            "Authenticated via {} ({})",
            parsed.auth_method, parsed.api_provider
        ))
    } else {
        Err(format!(
            "Claude Code CLI가 설치되어 있지만 로그인되어 있지 않습니다. `claude auth login`을 실행하세요. ({})",
            parsed.api_provider
        ))
    }
}

fn probe_ai_provider(provider: &str, command: String) -> AIProviderRuntimeStatus {
    let version_capture = match capture_command(Command::new(&command).args(["--version"])) {
        Ok(capture) => capture,
        Err(error) => {
            return AIProviderRuntimeStatus {
                status: "unavailable",
                detail: Some(error),
                command,
            };
        }
    };

    if !version_capture.status.success() {
        return AIProviderRuntimeStatus {
            status: "unavailable",
            detail: Some(sanitize_provider_detail(
                provider,
                &format!("{}\n{}", version_capture.stdout, version_capture.stderr),
            )),
            command,
        };
    }

    let version_detail = sanitize_provider_detail(
        provider,
        &format!("{}\n{}", version_capture.stdout, version_capture.stderr),
    );
    let auth_result = match provider {
        "Codex" => probe_codex_auth(&command),
        "Claude" => probe_claude_auth(&command),
        _ => Err(format!("unsupported AI provider: {provider}")),
    };

    match auth_result {
        Ok(auth_detail) => AIProviderRuntimeStatus {
            status: "available",
            detail: format_provider_probe_detail(provider, &version_detail, &auth_detail),
            command,
        },
        Err(error) => AIProviderRuntimeStatus {
            status: "unavailable",
            detail: format_provider_probe_detail(provider, &version_detail, &error),
            command,
        },
    }
}

fn ensure_ai_provider_ready(provider: &str, command: &str) -> Result<(), String> {
    let status = probe_ai_provider(provider, command.to_string());

    if status.status == "available" {
        return Ok(());
    }

    Err(status
        .detail
        .unwrap_or_else(|| format!("{provider} CLI를 현재 환경에서 사용할 수 없습니다.")))
}

fn get_github_identity() -> Result<Option<GitHubIdentity>, String> {
    let gh = gh_binary();
    let status_json = run_command(Command::new(&gh).args([
        "auth",
        "status",
        "--json",
        "hosts",
        "--active",
        "--hostname",
        "github.com",
    ]))?;

    let parsed: GhAuthStatusResponse = serde_json::from_str(&status_json)
        .map_err(|error| format!("invalid gh auth status payload: {error}"))?;
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
    let user_profile: Value = serde_json::from_str(&user_profile_json)
        .map_err(|error| format!("invalid gh user payload: {error}"))?;

    let email = run_command(Command::new(&gh).args(["api", "user/emails"]))
        .ok()
        .and_then(|raw| {
            let emails: Value = serde_json::from_str(&raw).ok()?;
            emails.as_array().and_then(|items| {
                items.iter().find_map(|item| {
                    if item
                        .get("primary")
                        .and_then(Value::as_bool)
                        .unwrap_or(false)
                    {
                        return item
                            .get("email")
                            .and_then(Value::as_str)
                            .map(str::to_string);
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
    let codex = codex_binary();
    let claude = claude_binary();
    let ai_provider_statuses = HashMap::from([
        ("Codex".to_string(), probe_ai_provider("Codex", codex)),
        ("Claude".to_string(), probe_ai_provider("Claude", claude)),
    ]);

    DesktopShellMetadata {
        runtime: "tauri",
        platform: std::env::consts::OS,
        app_name: "Harness Docs",
        app_version: env!("CARGO_PKG_VERSION"),
        version_control_provider: "github",
        authentication_provider: "github_oauth",
        supported_ai_providers: ["Codex", "Claude"],
        ai_provider_statuses,
        ai_task_probe_interval_ms: ai_task_probe_interval_ms(),
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
fn start_ai_task(
    app_handle: tauri::AppHandle,
    manager: tauri::State<AITaskManager>,
    task_id: String,
    input: AITaskExecutionInput,
) -> Result<AITaskExecutionHandle, String> {
    if task_id.trim().is_empty() {
        return Err("AI task id may not be empty".to_string());
    }

    let started_at = now_rfc3339();
    let working_directory = std::env::temp_dir().join("harness-docs-ai").join(format!(
        "{}-{}",
        input.provider.to_lowercase(),
        Utc::now().timestamp_millis()
    ));

    fs::create_dir_all(&working_directory)
        .map_err(|error| format!("failed to create AI working directory: {error}"))?;

    let provider = input.provider.clone();
    let prompt_label = input.prompt_label.clone();
    let working_directory_string = working_directory.display().to_string();

    let (command_name, mut command, output_path) = match input.provider.as_str() {
        "Codex" => {
            let codex = codex_binary();
            let output_path = working_directory.join("codex-last-message.txt");
            let mut command = Command::new(&codex);
            command.current_dir(&working_directory).args([
                "exec",
                "--json",
                "--skip-git-repo-check",
                "--sandbox",
                "read-only",
                "--ephemeral",
                "--output-last-message",
            ]);
            command.arg(&output_path).arg(&input.prompt);
            (codex, command, Some(output_path))
        }
        "Claude" => {
            let claude = claude_binary();
            let mut command = Command::new(&claude);
            command
                .current_dir(&working_directory)
                .args([
                    "-p",
                    "--verbose",
                    "--output-format",
                    "stream-json",
                    "--include-partial-messages",
                    "--disable-slash-commands",
                    "--no-session-persistence",
                ])
                .arg("--tools")
                .arg("")
                .arg(&input.prompt);
            (claude, command, None)
        }
        _ => return Err(format!("unsupported AI provider: {}", input.provider)),
    };

    ensure_ai_provider_ready(input.provider.as_str(), &command_name)?;
    command.stdout(Stdio::piped()).stderr(Stdio::piped());
    configure_command(&mut command);

    let mut child = command
        .spawn()
        .map_err(|error| format!("failed to start AI task: {error}"))?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "failed to capture AI stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "failed to capture AI stderr".to_string())?;
    let running_task = RunningAITask {
        child: Arc::new(Mutex::new(child)),
        cancelled: Arc::new(AtomicBool::new(false)),
    };

    {
        let mut tasks = manager
            .tasks
            .lock()
            .map_err(|_| "failed to lock AI task registry".to_string())?;

        if tasks.contains_key(&task_id) {
            return Err(format!("AI task already exists: {task_id}"));
        }

        tasks.insert(task_id.clone(), running_task.clone());
    }

    let stdout_buffer = Arc::new(Mutex::new(String::new()));
    let stderr_buffer = Arc::new(Mutex::new(String::new()));
    let completion_emitted = Arc::new(AtomicBool::new(false));
    let process_finished = Arc::new(AtomicBool::new(false));
    let codex_summary =
        (provider == "Codex").then(|| Arc::new(Mutex::new(CodexStreamSummary::default())));
    let claude_summary =
        (provider == "Claude").then(|| Arc::new(Mutex::new(ClaudeStreamSummary::default())));
    let stdout_reader = if let Some(summary) = codex_summary.clone() {
        spawn_codex_output_reader(
            stdout,
            stderr_buffer.clone(),
            summary,
            app_handle.clone(),
            task_id.clone(),
            command_name.clone(),
            prompt_label.clone(),
            working_directory_string.clone(),
            started_at.clone(),
            completion_emitted.clone(),
            process_finished.clone(),
            running_task.child.clone(),
        )
    } else if let Some(summary) = claude_summary.clone() {
        spawn_claude_output_reader(
            stdout,
            stdout_buffer.clone(),
            summary,
            app_handle.clone(),
            task_id.clone(),
        )
    } else {
        spawn_output_reader(
            stdout,
            stdout_buffer.clone(),
            app_handle.clone(),
            task_id.clone(),
            provider.clone(),
            "stdout",
        )
    };
    let codex_output_watcher = if provider == "Codex" {
        output_path.clone().map(|path| {
            spawn_codex_output_watcher(
                path,
                app_handle.clone(),
                task_id.clone(),
                command_name.clone(),
                prompt_label.clone(),
                working_directory_string.clone(),
                started_at.clone(),
                completion_emitted.clone(),
                process_finished.clone(),
                running_task.child.clone(),
            )
        })
    } else {
        None
    };
    let stderr_reader = spawn_output_reader(
        stderr,
        stderr_buffer.clone(),
        app_handle.clone(),
        task_id.clone(),
        provider.clone(),
        "stderr",
    );
    let registry = manager.tasks.clone();
    let task_id_for_thread = task_id.clone();
    let provider_for_thread = provider.clone();
    let prompt_label_for_thread = prompt_label.clone();
    let command_name_for_thread = command_name.clone();
    let started_at_for_thread = started_at.clone();
    let working_directory_for_thread = working_directory_string.clone();
    let completion_emitted_for_thread = completion_emitted.clone();
    let process_finished_for_thread = process_finished.clone();

    thread::spawn(move || {
        let status = loop {
            let poll_result = match running_task.child.lock() {
                Ok(mut child) => child.try_wait(),
                Err(_) => {
                    let completed_at = now_rfc3339();
                    emit_ai_task_event(
                        &app_handle,
                        AITaskExecutionEvent::Failed {
                            task_id: task_id_for_thread.clone(),
                            error: "AI task process state became unavailable.".to_string(),
                            completed_at,
                        },
                    );

                    if let Ok(mut tasks) = registry.lock() {
                        tasks.remove(&task_id_for_thread);
                    }

                    return;
                }
            };

            match poll_result {
                Ok(Some(status)) => break status,
                Ok(None) => thread::sleep(Duration::from_millis(50)),
                Err(error) => {
                    let completed_at = now_rfc3339();
                    emit_ai_task_event(
                        &app_handle,
                        AITaskExecutionEvent::Failed {
                            task_id: task_id_for_thread.clone(),
                            error: format!("failed to inspect AI task status: {error}"),
                            completed_at,
                        },
                    );

                    if let Ok(mut tasks) = registry.lock() {
                        tasks.remove(&task_id_for_thread);
                    }

                    return;
                }
            }
        };

        process_finished_for_thread.store(true, Ordering::Relaxed);
        let _ = stdout_reader.join();
        if let Some(watcher) = codex_output_watcher {
            let _ = watcher.join();
        }
        let _ = stderr_reader.join();

        let completed_at = now_rfc3339();
        let stdout_output = read_buffered_output(&stdout_buffer);
        let stderr_output = read_buffered_output(&stderr_buffer);
        let codex_summary = codex_summary
            .as_ref()
            .and_then(|summary| summary.lock().ok().map(|value| value.clone()));
        let claude_summary = claude_summary
            .as_ref()
            .and_then(|summary| summary.lock().ok().map(|value| value.clone()));

        if status.success() {
            if let Some(error) = claude_summary
                .as_ref()
                .and_then(|summary| summary.error.clone())
            {
                emit_ai_task_event(
                    &app_handle,
                    AITaskExecutionEvent::Failed {
                        task_id: task_id_for_thread.clone(),
                        error,
                        completed_at,
                    },
                );

                if let Ok(mut tasks) = registry.lock() {
                    tasks.remove(&task_id_for_thread);
                }

                return;
            }

            let output = match output_path {
                Some(path) => fs::read_to_string(path)
                    .map(|value| strip_provider_output_noise(&provider_for_thread, &value))
                    .unwrap_or_else(|_| {
                        codex_summary
                            .as_ref()
                            .and_then(|summary| summary.final_result.clone())
                            .filter(|result| !result.trim().is_empty())
                            .unwrap_or_else(|| {
                                normalize_command_success_output(
                                    &strip_provider_output_noise(
                                        &provider_for_thread,
                                        &stdout_output,
                                    ),
                                    &strip_provider_output_noise(
                                        &provider_for_thread,
                                        &stderr_output,
                                    ),
                                )
                            })
                    }),
                None if provider_for_thread == "Claude" => claude_summary
                    .as_ref()
                    .and_then(|summary| summary.final_result.clone())
                    .filter(|result| !result.trim().is_empty())
                    .unwrap_or_else(|| {
                        normalize_command_success_output(
                            &strip_provider_output_noise(&provider_for_thread, &stdout_output),
                            &strip_provider_output_noise(&provider_for_thread, &stderr_output),
                        )
                    }),
                None => normalize_command_success_output(
                    &strip_provider_output_noise(&provider_for_thread, &stdout_output),
                    &strip_provider_output_noise(&provider_for_thread, &stderr_output),
                ),
            };

            let _ = emit_ai_task_completed_if_pending(
                &app_handle,
                &task_id_for_thread,
                build_ai_task_execution_result(
                    provider_for_thread,
                    command_name_for_thread,
                    prompt_label_for_thread,
                    output,
                    working_directory_for_thread,
                    started_at_for_thread,
                    completed_at,
                ),
                &completion_emitted_for_thread,
            );
        } else if running_task.cancelled.load(Ordering::Relaxed) {
            if !completion_emitted_for_thread.load(Ordering::Relaxed) {
                emit_ai_task_event(
                    &app_handle,
                    AITaskExecutionEvent::Cancelled {
                        task_id: task_id_for_thread.clone(),
                        completed_at,
                    },
                );
            }
        } else {
            if !completion_emitted_for_thread.load(Ordering::Relaxed) {
                emit_ai_task_event(
                    &app_handle,
                    AITaskExecutionEvent::Failed {
                        task_id: task_id_for_thread.clone(),
                        error: claude_summary
                            .as_ref()
                            .and_then(|summary| summary.error.clone())
                            .unwrap_or_else(|| {
                                normalize_command_error_output(
                                    &strip_provider_output_noise(
                                        &provider_for_thread,
                                        &stderr_output,
                                    ),
                                    &strip_provider_output_noise(
                                        &provider_for_thread,
                                        &stdout_output,
                                    ),
                                    &status,
                                )
                            }),
                        completed_at,
                    },
                );
            }
        }

        if let Ok(mut tasks) = registry.lock() {
            tasks.remove(&task_id_for_thread);
        }
    });

    Ok(AITaskExecutionHandle {
        task_id,
        provider,
        command: command_name,
        prompt_label,
        working_directory: working_directory_string,
        started_at,
    })
}

#[tauri::command]
fn cancel_ai_task(manager: tauri::State<AITaskManager>, task_id: String) -> Result<(), String> {
    let running_task = {
        let tasks = manager
            .tasks
            .lock()
            .map_err(|_| "failed to lock AI task registry".to_string())?;

        tasks
            .get(&task_id)
            .cloned()
            .ok_or_else(|| format!("AI task not found: {task_id}"))?
    };

    running_task.cancelled.store(true, Ordering::Relaxed);

    let mut child = running_task
        .child
        .lock()
        .map_err(|_| "failed to access AI task process".to_string())?;

    match child.kill() {
        Ok(()) => Ok(()),
        Err(error) => match child.try_wait() {
            Ok(Some(_)) => Ok(()),
            Ok(None) => Err(format!("failed to cancel AI task: {error}")),
            Err(wait_error) => Err(format!(
                "failed to cancel AI task: {error}; additionally failed to inspect process state: {wait_error}"
            )),
        },
    }
}

#[tauri::command]
fn probe_ai_task_result(
    input: AITaskResultProbeInput,
) -> Result<Option<AITaskExecutionResult>, String> {
    let _task_id = input.task_id;
    let working_directory = ensure_safe_ai_task_working_directory(&input.working_directory)?;

    match input.provider.as_str() {
        "Codex" => {
            let output_path = working_directory.join("codex-last-message.txt");

            if !output_path.exists() {
                return Ok(None);
            }

            let output = fs::read_to_string(&output_path)
                .map_err(|error| format!("failed to read Codex output: {error}"))?;
            let output = strip_provider_output_noise("Codex", output.trim())
                .trim()
                .to_string();

            if output.is_empty() {
                return Ok(None);
            }

            Ok(Some(build_ai_task_execution_result(
                input.provider,
                input.command,
                input.prompt_label,
                output,
                working_directory.display().to_string(),
                input.started_at,
                now_rfc3339(),
            )))
        }
        _ => Ok(None),
    }
}

#[tauri::command]
fn execute_github_publish(input: PublishExecutionInput) -> Result<PublishExecutionResult, String> {
    let started_at = now_rfc3339();
    let gh = gh_binary();
    let git = git_binary();
    let repository_name = format!("{}/{}", input.repository.owner, input.repository.name);
    let repository_root = std::env::temp_dir()
        .join("harness-docs-github")
        .join(format!(
            "{}__{}",
            input.repository.owner, input.repository.name
        ));

    if !repository_root.join(".git").exists() {
        if let Some(parent) = repository_root.parent() {
            fs::create_dir_all(parent).map_err(|error| {
                format!("failed to prepare repository cache directory: {error}")
            })?;
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

    let base_branch = if input
        .publish_record
        .publication
        .repository
        .base_branch
        .is_empty()
    {
        input.repository.default_branch.as_str()
    } else {
        input
            .publish_record
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

    let has_changes = configure_command(Command::new(&git).args([
        "-C",
        repository_root.to_string_lossy().as_ref(),
        "diff",
        "--cached",
        "--quiet",
        "--exit-code",
    ]))
    .status()
    .map_err(|error| format!("failed to inspect staged publish changes: {error}"))?
    .success()
        == false;

    if !has_changes {
        return Err(
            "No publishable file changes were detected for the current publish batch.".to_string(),
        );
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
        .manage(AITaskManager::default())
        .invoke_handler(tauri::generate_handler![
            get_desktop_shell_metadata,
            get_github_authentication_session,
            start_github_sign_in,
            sign_out_github,
            start_ai_task,
            cancel_ai_task,
            probe_ai_task_result,
            execute_github_publish
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{
        parse_claude_stream_line, parse_codex_stream_line, ClaudeStreamLineAction,
        CodexStreamLineAction,
    };

    #[test]
    fn parses_claude_text_delta_events() {
        let line = r#"{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"hello"}}}"#;

        match parse_claude_stream_line(line) {
            ClaudeStreamLineAction::AppendText(text) => assert_eq!(text, "hello"),
            _ => panic!("expected text delta to be emitted"),
        }
    }

    #[test]
    fn parses_claude_assistant_messages_as_final_result() {
        let line = r#"{"type":"assistant","message":{"content":[{"type":"text","text":"hello"},{"type":"text","text":" world"}]}}"#;

        match parse_claude_stream_line(line) {
            ClaudeStreamLineAction::SetFinalResult(text) => assert_eq!(text, "hello world"),
            _ => panic!("expected assistant message to become final result"),
        }
    }

    #[test]
    fn parses_claude_error_results() {
        let line = r#"{"type":"result","subtype":"error_max_turns","is_error":true,"result":"stopped early"}"#;

        match parse_claude_stream_line(line) {
            ClaudeStreamLineAction::SetError(error) => assert_eq!(error, "stopped early"),
            _ => panic!("expected result errors to be captured"),
        }
    }

    #[test]
    fn parses_codex_agent_message_items_as_final_result() {
        let line = r#"{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"hi"}}"#;

        match parse_codex_stream_line(line) {
            CodexStreamLineAction::SetFinalResult(text) => assert_eq!(text, "hi"),
            _ => panic!("expected agent message item to become final result"),
        }
    }

    #[test]
    fn parses_codex_error_messages_as_warnings() {
        let line = r#"{"type":"error","message":"Reconnecting... 2/5"}"#;

        match parse_codex_stream_line(line) {
            CodexStreamLineAction::EmitWarning(message) => {
                assert_eq!(message, "Reconnecting... 2/5")
            }
            _ => panic!("expected codex error event to be surfaced as warning"),
        }
    }
}

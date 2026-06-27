use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager};
use tauri_plugin_shell::ShellExt;

// ── PTY state ─────────────────────────────────────────────────────────────────

struct PtySession {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    master: Arc<Mutex<Box<dyn portable_pty::MasterPty + Send>>>,
}

#[derive(Default)]
struct AppState {
    ptys: Mutex<HashMap<String, PtySession>>,
}

fn detect_shell() -> String {
    std::env::var("SHELL").unwrap_or_else(|_| {
        #[cfg(target_os = "windows")]
        { "powershell.exe".to_string() }
        #[cfg(not(target_os = "windows"))]
        {
            let candidates: &[&str] = if cfg!(target_os = "macos") {
                &["/bin/zsh", "/bin/bash", "/bin/sh"]
            } else {
                &["/bin/bash", "/bin/sh"]
            };
            candidates.iter()
                .find(|p| std::path::Path::new(**p).exists())
                .unwrap_or(&"/bin/sh")
                .to_string()
        }
    })
}

#[tauri::command]
async fn pty_create(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    tab_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    // Drop any existing session for this tab
    state.ptys.lock().unwrap().remove(&tab_id);

    let pty_sys = native_pty_system();
    let pair = pty_sys
        .openpty(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| e.to_string())?;

    let shell = detect_shell();
    let mut cmd = CommandBuilder::new(&shell);
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    cmd.env("LANG", "en_US.UTF-8");

    let home = std::env::var("HOME").unwrap_or_else(|_| "/".to_string());
    cmd.cwd(&home);
    cmd.env("HOME", &home);

    #[cfg(target_os = "macos")]
    {
        let base = std::env::var("PATH").unwrap_or_default();
        cmd.env(
            "PATH",
            format!("/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin:{base}"),
        );
    }

    let _child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    drop(pair.slave);

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer  = pair.master.take_writer().map_err(|e| e.to_string())?;
    let master  = Arc::new(Mutex::new(pair.master));
    let writer  = Arc::new(Mutex::new(writer));

    // Reader thread → emit output events to frontend
    let emit_app = app.clone();
    let emit_tab = tab_id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    let s = String::from_utf8_lossy(&buf[..n]).into_owned();
                    let _ = emit_app.emit(&format!("pty-output:{emit_tab}"), s);
                }
            }
        }
        let _ = emit_app.emit(&format!("pty-exit:{emit_tab}"), "");
    });

    state.ptys.lock().unwrap().insert(tab_id, PtySession { writer, master });
    Ok(())
}

#[tauri::command]
async fn pty_write(
    state: tauri::State<'_, AppState>,
    tab_id: String,
    data: String,
) -> Result<(), String> {
    let arc = {
        let ptys = state.ptys.lock().unwrap();
        ptys.get(&tab_id).map(|s| s.writer.clone())
    };
    if let Some(arc) = arc {
        let mut w = arc.lock().unwrap();
        w.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn pty_resize(
    state: tauri::State<'_, AppState>,
    tab_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let arc = {
        let ptys = state.ptys.lock().unwrap();
        ptys.get(&tab_id).map(|s| s.master.clone())
    };
    if let Some(arc) = arc {
        let m = arc.lock().unwrap();
        m.resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn pty_close(
    state: tauri::State<'_, AppState>,
    tab_id: String,
) -> Result<(), String> {
    state.ptys.lock().unwrap().remove(&tab_id);
    Ok(())
}

// ── Window state persistence (Apple HIG: remember last position/size) ─────────

#[derive(serde::Serialize, serde::Deserialize)]
struct WindowState { x: i32, y: i32, width: u32, height: u32 }

fn window_state_path(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_data_dir().ok().map(|d| d.join("window-state.json"))
}

fn load_window_state(app: &tauri::AppHandle) -> Option<WindowState> {
    let json = std::fs::read_to_string(window_state_path(app)?).ok()?;
    serde_json::from_str(&json).ok()
}

fn save_window_state(app: &tauri::AppHandle, state: WindowState) {
    let Some(path) = window_state_path(app) else { return };
    if let Some(p) = path.parent() { let _ = std::fs::create_dir_all(p); }
    if let Ok(json) = serde_json::to_string(&state) { let _ = std::fs::write(path, json); }
}

// ── Webview / browser commands ────────────────────────────────────────────────

#[tauri::command]
async fn browser_navigate(app: tauri::AppHandle, label: String, url: String) -> Result<(), String> {
    let parsed = url.parse::<url::Url>().map_err(|e| e.to_string())?;
    app.webviews()
        .get(&label)
        .ok_or_else(|| format!("webview '{label}' not found"))?
        .navigate(parsed)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn browser_reload(app: tauri::AppHandle, label: String) -> Result<(), String> {
    app.webviews()
        .get(&label)
        .ok_or_else(|| format!("webview '{label}' not found"))?
        .reload()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn browser_back(app: tauri::AppHandle, label: String) -> Result<(), String> {
    app.webviews()
        .get(&label)
        .ok_or_else(|| format!("webview '{label}' not found"))?
        .eval("history.back()")
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn browser_forward(app: tauri::AppHandle, label: String) -> Result<(), String> {
    app.webviews()
        .get(&label)
        .ok_or_else(|| format!("webview '{label}' not found"))?
        .eval("history.forward()")
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn browser_url(app: tauri::AppHandle, label: String) -> String {
    // wry panics when WKWebView.URL() is nil (webview not yet navigated).
    // Catch the unwind and return "" — caller treats that as "not ready".
    std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        app.webviews()
            .get(&label)
            .and_then(|wv| wv.url().ok())
            .map(|u| u.to_string())
            .unwrap_or_default()
    }))
    .unwrap_or_default()
}

#[tauri::command]
async fn browser_eval(
    app: tauri::AppHandle,
    label: String,
    key: String,
    js: String,
) -> Result<(), String> {
    let emit_app   = app.clone();
    let emit_label = label.clone();
    let emit_key   = key.clone();

    app.webviews()
        .get(&label)
        .ok_or_else(|| format!("webview '{label}' not found"))?
        .eval_with_callback(js, move |result: String| {
            let _ = emit_app.emit("browser-eval-result", serde_json::json!({
                "label": emit_label,
                "key":   emit_key,
                "value": result,
            }));
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn browser_devtools(app: tauri::AppHandle, label: String) {
    #[cfg(debug_assertions)]
    if let Some(wv) = app.webviews().get(&label) {
        wv.open_devtools();
    }
    #[cfg(not(debug_assertions))]
    let _ = (app, label);
}

#[tauri::command]
async fn open_devtools(app: tauri::AppHandle) {
    #[cfg(debug_assertions)]
    if let Some(w) = app.get_webview_window("main") {
        w.open_devtools();
    }
    #[cfg(not(debug_assertions))]
    let _ = app;
}

// ── Settings window ───────────────────────────────────────────────────────────

#[tauri::command]
async fn open_settings(app: tauri::AppHandle) -> Result<(), String> {
    // If already open, focus it
    if let Some(win) = app.get_webview_window("settings") {
        win.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    tauri::WebviewWindowBuilder::new(
        &app,
        "settings",
        tauri::WebviewUrl::App("index.html#settings".into()),
    )
    .title("Sonar Settings")
    .inner_size(740.0, 560.0)
    .resizable(false)
    .center()
    .decorations(true)
    .build()
    .map(|_| ())
    .map_err(|e| e.to_string())
}

// ── MCP binary path ───────────────────────────────────────────────────────────

#[tauri::command]
async fn get_mcp_path(app: tauri::AppHandle) -> String {
    let fname = {
        #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
        { "mcp-server-aarch64-apple-darwin" }
        #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
        { "mcp-server-x86_64-apple-darwin" }
        #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
        { "mcp-server-x86_64-unknown-linux-gnu" }
        #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
        { "mcp-server-x86_64-pc-windows-msvc.exe" }
        #[cfg(not(any(
            all(target_os = "macos", target_arch = "aarch64"),
            all(target_os = "macos", target_arch = "x86_64"),
            all(target_os = "linux", target_arch = "x86_64"),
            all(target_os = "windows", target_arch = "x86_64"),
        )))]
        { "mcp-server" }
    };

    if let Ok(dir) = app.path().resource_dir() {
        let p = dir.join(fname);
        if p.exists() {
            return p.to_string_lossy().to_string();
        }
    }

    if let Ok(exe) = std::env::current_exe() {
        let candidate = exe
            .parent().and_then(|p| p.parent()).and_then(|p| p.parent())
            .map(|root| root.join("src-tauri/binaries").join(fname));
        if let Some(p) = candidate {
            if p.exists() {
                return p.to_string_lossy().to_string();
            }
        }
    }

    fname.to_string()
}

// ── Write MCP config files (one-click setup) ──────────────────────────────────

#[tauri::command]
async fn write_mcp_config(path: String, content: String) -> Result<(), String> {
    use std::path::Path;

    let expanded = if path.starts_with('~') {
        let home = std::env::var("HOME").unwrap_or_default();
        path.replacen('~', &home, 1)
    } else {
        path
    };

    let p = Path::new(&expanded);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(p, content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    let expanded = if path.starts_with('~') {
        let home = std::env::var("HOME").unwrap_or_default();
        path.replacen('~', &home, 1)
    } else {
        path
    };
    std::fs::read_to_string(&expanded).map_err(|e| e.to_string())
}

// ── Native menu ───────────────────────────────────────────────────────────────

fn build_menu(app: &tauri::AppHandle) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    use tauri::menu::{
        MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder,
    };

    let modifier = "CmdOrCtrl";

    let app_menu = SubmenuBuilder::new(app, "Sonar")
        .item(&PredefinedMenuItem::about(app, Some("About Sonar"), None)?)
        .separator()
        .item(&MenuItemBuilder::with_id("settings", "Settings…")
            .accelerator(&format!("{modifier}+,"))
            .build(app)?)
        .separator()
        .item(&PredefinedMenuItem::hide(app, None)?)
        .item(&PredefinedMenuItem::hide_others(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::quit(app, None)?)
        .build()?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&MenuItemBuilder::with_id("new_tab", "New Tab")
            .accelerator(&format!("{modifier}+T"))
            .build(app)?)
        .item(&MenuItemBuilder::with_id("new_terminal", "New Terminal Tab")
            .accelerator(&format!("{modifier}+Shift+T"))
            .build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("close_tab", "Close Tab")
            .accelerator(&format!("{modifier}+W"))
            .build(app)?)
        .separator()
        .item(&PredefinedMenuItem::close_window(app, None)?)
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&PredefinedMenuItem::undo(app, None)?)
        .item(&PredefinedMenuItem::redo(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, None)?)
        .item(&PredefinedMenuItem::copy(app, None)?)
        .item(&PredefinedMenuItem::paste(app, None)?)
        .item(&PredefinedMenuItem::select_all(app, None)?)
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&MenuItemBuilder::with_id("toggle_sidebar", "Toggle Sidebar")
            .accelerator(&format!("{modifier}+B"))
            .build(app)?)
        .item(&MenuItemBuilder::with_id("reload_page", "Reload Page")
            .accelerator(&format!("{modifier}+R"))
            .build(app)?)
        .item(&MenuItemBuilder::with_id("hard_reload", "Hard Reload")
            .accelerator(&format!("{modifier}+Shift+R"))
            .build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("toggle_console", "Developer Console")
            .accelerator(&format!("{modifier}+Option+J"))
            .build(app)?)
        .item(&MenuItemBuilder::with_id("inspect_sonar", "Inspect Sonar")
            .accelerator(&format!("{modifier}+Option+I"))
            .build(app)?)
        .separator()
        .item(&PredefinedMenuItem::fullscreen(app, None)?)
        .build()?;

    let nav_menu = SubmenuBuilder::new(app, "Navigate")
        .item(&MenuItemBuilder::with_id("nav_back", "Back")
            .accelerator(&format!("{modifier}+["))
            .build(app)?)
        .item(&MenuItemBuilder::with_id("nav_forward", "Forward")
            .accelerator(&format!("{modifier}+]"))
            .build(app)?)
        .item(&MenuItemBuilder::with_id("focus_address", "Focus Address Bar")
            .accelerator(&format!("{modifier}+L"))
            .build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("nav_home", "Home")
            .accelerator(&format!("{modifier}+Shift+H"))
            .build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("prev_tab", "Previous Tab")
            .accelerator(&format!("{modifier}+Shift+["))
            .build(app)?)
        .item(&MenuItemBuilder::with_id("next_tab", "Next Tab")
            .accelerator(&format!("{modifier}+Shift+]"))
            .build(app)?)
        .build()?;

    let services_menu = SubmenuBuilder::new(app, "Services")
        .item(&MenuItemBuilder::with_id("refresh_ports", "Refresh Port Scan")
            .accelerator(&format!("{modifier}+Shift+P"))
            .build(app)?)
        .item(&MenuItemBuilder::with_id("show_all_ports", "Show All Ports")
            .build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("open_ai_integrations", "AI Integrations…")
            .build(app)?)
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .item(&PredefinedMenuItem::minimize(app, None)?)
        .item(&PredefinedMenuItem::maximize(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::bring_all_to_front(app, None)?)
        .build()?;

    MenuBuilder::new(app)
        .item(&app_menu)
        .item(&file_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&nav_menu)
        .item(&services_menu)
        .item(&window_menu)
        .build()
}

// ── Entry point ───────────────────────────────────────────────────────────────

pub fn run() {
    let mut builder = tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            browser_navigate,
            browser_reload,
            browser_back,
            browser_forward,
            browser_url,
            browser_eval,
            browser_devtools,
            open_devtools,
            get_mcp_path,
            open_settings,
            write_mcp_config,
            read_file,
            pty_create,
            pty_write,
            pty_resize,
            pty_close,
        ]);

    builder = builder.setup(|app| {
        // Build and set native menu
        if let Ok(menu) = build_menu(app.handle()) {
            app.set_menu(menu).ok();
        }

        // Handle native menu events → emit to frontend
        let handle = app.handle().clone();
        app.on_menu_event(move |_app, event| {
            let id = event.id().as_ref().to_string();
            let payload = serde_json::json!({ "id": id });
            if let Some(win) = handle.get_webview_window("main") {
                let _ = win.emit("menu-action", payload);
            }
        });

        // Restore saved window position/size (Apple HIG: state restoration)
        if let Some(win) = app.get_webview_window("main") {
            if let Some(state) = load_window_state(app.handle()) {
                // Sanity-check position (guard against off-screen from disconnected monitor)
                if state.x > -3840 && state.y >= -50 {
                    let _ = win.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                        width:  state.width.max(960),
                        height: state.height.max(600),
                    }));
                    let _ = win.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                        x: state.x,
                        y: state.y.max(0),
                    }));
                }
            }

            // Save window state when user closes the window
            let save_app = app.handle().clone();
            let win_ref  = win.clone();
            win.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { .. } = event {
                    if let (Ok(pos), Ok(size)) = (win_ref.outer_position(), win_ref.outer_size()) {
                        save_window_state(&save_app, WindowState {
                            x: pos.x, y: pos.y,
                            width: size.width, height: size.height,
                        });
                    }
                }
            });
        }

        // Start port-scanner sidecar
        let handle = app.handle().clone();
        tauri::async_runtime::spawn(async move {
            match handle.shell().sidecar("port-scanner") {
                Ok(cmd) => {
                    if let Err(e) = cmd.spawn() {
                        eprintln!("port-scanner spawn failed: {e}");
                    }
                }
                Err(e) => eprintln!("port-scanner sidecar not found: {e}"),
            }
        });

        Ok(())
    });

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

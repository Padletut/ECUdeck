#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod contracts;
mod plugin_contracts;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::ai::prepare_context_snapshot,
            commands::ai::send_ai_chat,
            commands::plugins::discover_plugin_manifests,
            commands::plugins::validate_plugin_manifest,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ECUDeck desktop shell");
}

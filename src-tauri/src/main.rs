#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod contracts;
mod plugin_contracts;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::plugins::validate_plugin_manifest,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ECUDeck desktop shell");
}

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::command;

#[tauri::command]
fn list_printers() -> Vec<String> {
    vec!["Test Printer 1".to_string(), "Test Printer 2".to_string()]
}

#[tauri::command]
fn list_usb_printers() -> Vec<String> {
    vec!["USB Printer 1".to_string(), "USB Printer 2".to_string()]
}

#[tauri::command]
fn list_all_printers() -> Vec<String> {
    vec!["All Printer 1".to_string(), "All Printer 2".to_string()]
}

#[tauri::command]
fn test_printers() -> Vec<String> {
    vec!["Test Printer 1".to_string(), "Test Printer 2".to_string()]
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            list_printers, 
            list_usb_printers, 
            list_all_printers, 
            test_printers
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

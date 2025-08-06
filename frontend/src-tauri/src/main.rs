// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use tauri::Manager;

#[tauri::command]
async fn start_backend() -> Result<(), String> {
    // Start the backend server
    let backend_path = std::env::current_dir()
        .unwrap()
        .join("backend");
    
    if backend_path.exists() {
        let output = Command::new("npm")
            .arg("start")
            .current_dir(&backend_path)
            .spawn();
        
        match output {
            Ok(_) => println!("Backend server started"),
            Err(e) => eprintln!("Failed to start backend: {}", e),
        }
    } else {
        eprintln!("Backend directory not found at: {}", backend_path.display());
    }
    
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![start_backend])
        .setup(|app| {
            // Get the app data directory for database persistence
            let app_data_dir = app.path().app_data_dir().unwrap();
            let database_dir = app_data_dir.join("database");
            let database_path = database_dir.join("dev.db");
            
            // Create database directory if it doesn't exist
            if !database_dir.exists() {
                std::fs::create_dir_all(&database_dir).unwrap();
            }
            
            // Copy existing database from backend if it exists and target doesn't
            if !database_path.exists() {
                // Try to find the backend database relative to the current executable
                let current_exe = std::env::current_exe().unwrap();
                let app_dir = current_exe.parent().unwrap();
                let backend_db_path = app_dir.join("backend").join("prisma").join("dev.db");
                
                if backend_db_path.exists() {
                    if let Err(e) = std::fs::copy(&backend_db_path, &database_path) {
                        eprintln!("Failed to copy database: {}", e);
                    } else {
                        println!("Database copied to persistent location: {}", database_path.display());
                    }
                } else {
                    // Try alternative path for development
                    let dev_backend_path = std::env::current_dir().unwrap().join("..").join("backend").join("prisma").join("dev.db");
                    if dev_backend_path.exists() {
                        if let Err(e) = std::fs::copy(&dev_backend_path, &database_path) {
                            eprintln!("Failed to copy database: {}", e);
                        } else {
                            println!("Database copied to persistent location: {}", database_path.display());
                        }
                    }
                }
            }
            
            // Set environment variable for database path
            std::env::set_var("DATABASE_URL", format!("file:{}", database_path.display()));
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

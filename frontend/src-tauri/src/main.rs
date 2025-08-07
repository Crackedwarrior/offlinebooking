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

#[tauri::command]
fn list_printers() -> Vec<String> {
    // Use the serialport crate to get a list of available serial ports
    match serialport::available_ports() {
        Ok(ports) => {
            // Extract the port names from the available ports
            let port_names: Vec<String> = ports
                .iter()
                .map(|p| p.port_name.clone())
                .collect();
            
            if port_names.is_empty() {
                println!("No serial ports detected on the system");
                // Return an empty vector if no ports are found
                vec![]
            } else {
                println!("Detected serial ports: {:?}", port_names);
                port_names
            }
        },
        Err(e) => {
            eprintln!("Error listing serial ports: {}", e);
            // Return an empty vector in case of error
            vec![]
        }
    }
}

#[tauri::command]
async fn test_printer_connection(port: String) -> Result<bool, String> {
    println!("Testing printer connection on port: {}", port);
    
    // Attempt to open the serial port with standard settings for Epson TM-T20 printer
    // Baud rate: 9600, Data bits: 8, Parity: None, Stop bits: 1, Flow control: None
    let port_result = serialport::new(&port, 9600)
        .data_bits(serialport::DataBits::Eight)
        .parity(serialport::Parity::None)
        .stop_bits(serialport::StopBits::One)
        .flow_control(serialport::FlowControl::None)
        .timeout(std::time::Duration::from_millis(1000))
        .open();
    
    match port_result {
        Ok(_port) => {
            // Successfully opened the port
            println!("Successfully connected to printer on port: {}", port);
            Ok(true)
        },
        Err(e) => {
            // Failed to open the port
            eprintln!("Failed to connect to printer on port {}: {:?}", port, e);
            Err(format!("Failed to connect to printer on port {}: {:?}", port, e))
        }
    }
}

#[tauri::command]
async fn print_ticket(port: String, commands: String) -> Result<bool, String> {
    println!("Printing ticket on port: {} with {} bytes of commands", port, commands.len());
    
    // Attempt to open the serial port with standard settings for Epson TM-T20 printer
    let port_result = serialport::new(&port, 9600)
        .data_bits(serialport::DataBits::Eight)
        .parity(serialport::Parity::None)
        .stop_bits(serialport::StopBits::One)
        .flow_control(serialport::FlowControl::None)
        .timeout(std::time::Duration::from_millis(3000))
        .open();
    
    match port_result {
        Ok(mut port) => {
            // Convert the commands string to bytes
            let command_bytes = commands.as_bytes();
            
            // Send the commands to the printer
            match port.write(command_bytes) {
                Ok(bytes_written) => {
                    let port_name = port.name().unwrap_or_else(|| String::from("unknown"));
                    println!("Successfully sent {} bytes to printer on port: {}", bytes_written, port_name);
                    if bytes_written == command_bytes.len() {
                        Ok(true)
                    } else {
                        Err(format!("Only wrote {} of {} bytes to printer", bytes_written, command_bytes.len()))
                    }
                },
                Err(e) => {
                    let port_name = port.name().unwrap_or_else(|| String::from("unknown"));
                    eprintln!("Failed to write to printer on port {}: {:?}", port_name, e);
                    Err(format!("Failed to write to printer on port {}: {:?}", port_name, e))
                }
            }
        },
        Err(e) => {
            // Failed to open the port
            eprintln!("Failed to connect to printer on port {}: {:?}", port, e);
            Err(format!("Failed to connect to printer on port {}: {:?}", port, e))
        }
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![start_backend, list_printers, test_printer_connection, print_ticket])
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

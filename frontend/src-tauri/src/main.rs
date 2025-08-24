// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use tauri::Manager;

#[tauri::command]
async fn start_backend() -> Result<(), String> {
    // Start the backend server
    let exe_path = std::env::current_exe().unwrap();
    let app_dir = exe_path.parent().unwrap();
    let backend_path = app_dir.join("backend");
    
    println!("🔍 Looking for backend at: {}", backend_path.display());
    
    if backend_path.exists() {
        println!("✅ Backend directory found, starting server...");
        let output = Command::new("npm")
            .arg("start")
            .current_dir(&backend_path)
            .spawn();
        
        match output {
            Ok(_) => println!("✅ Backend server started successfully"),
            Err(e) => eprintln!("❌ Failed to start backend: {}", e),
        }
    } else {
        eprintln!("❌ Backend directory not found at: {}", backend_path.display());
            // Try alternative paths
    let alt_paths = vec![
        app_dir.join("..").join("backend"),
        app_dir.join("..").join("..").join("backend"),
        std::env::current_dir().unwrap().join("backend"),
        std::env::current_dir().unwrap().join("..").join("backend"),
    ];
        
        for alt_path in alt_paths {
            println!("🔍 Trying alternative path: {}", alt_path.display());
            if alt_path.exists() {
                println!("✅ Found backend at alternative path: {}", alt_path.display());
                let output = Command::new("npm")
                    .arg("start")
                    .current_dir(&alt_path)
                    .spawn();
                
                match output {
                    Ok(_) => {
                        println!("✅ Backend server started from alternative path");
                        return Ok(());
                    },
                    Err(e) => eprintln!("❌ Failed to start backend from alternative path: {}", e),
                }
            }
        }
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
fn list_usb_printers() -> Vec<String> {
    println!("🔍 list_usb_printers command called");
    
    // For Windows, we'll use PowerShell to get actual printer names
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        
        println!("🔍 Running PowerShell command to get USB printers...");
        // Use PowerShell instead of wmic - more reliable in Tauri
        let output = Command::new("powershell")
            .args(&["-Command", "Get-Printer | Where-Object {$_.PortName -like '*USB*' -or $_.Name -like '*USB*' -or $_.Name -like '*EPSON*' -or $_.Name -like '*Receipt*'} | Select-Object Name,PortName | ConvertTo-Csv -NoTypeInformation"])
            .output();
        
        match output {
            Ok(output) => {
                println!("🔍 PowerShell command executed successfully");
                println!("🔍 Exit code: {}", output.status);
                println!("🔍 Stdout: {}", String::from_utf8_lossy(&output.stdout));
                println!("🔍 Stderr: {}", String::from_utf8_lossy(&output.stderr));
                
                let output_str = String::from_utf8_lossy(&output.stdout);
                let lines: Vec<&str> = output_str.lines().collect();
                
                let mut printers = Vec::new();
                for line in lines.iter().skip(1) { // Skip header
                    if !line.trim().is_empty() {
                        let parts: Vec<&str> = line.split(',').collect();
                        if parts.len() >= 2 {
                            let printer_name = parts[0].trim_matches('"');
                            let port_name = parts[1].trim_matches('"');
                            
                            if !printer_name.trim().is_empty() {
                                printers.push(format!("{} ({})", printer_name, port_name));
                            }
                        }
                    }
                }
                
                println!("✅ Detected Windows USB printers via PowerShell: {:?}", printers);
                printers
            },
            Err(e) => {
                eprintln!("❌ Error getting Windows USB printers via PowerShell: {}", e);
                vec![]
            }
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        vec![]
    }
}

#[tauri::command]
fn list_all_printers() -> Vec<String> {
    println!("🔍 list_all_printers command called");
    
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        
        println!("🔍 Running PowerShell command to get all printers...");
        let output = Command::new("powershell")
            .args(&["-Command", "Get-Printer | Select-Object Name | ConvertTo-Csv -NoTypeInformation"])
            .output();
        
        match output {
            Ok(output) => {
                println!("🔍 PowerShell command executed successfully");
                println!("🔍 Exit code: {}", output.status);
                println!("🔍 Stdout: {}", String::from_utf8_lossy(&output.stdout));
                println!("🔍 Stderr: {}", String::from_utf8_lossy(&output.stderr));
                
                let output_str = String::from_utf8_lossy(&output.stdout);
                let lines: Vec<&str> = output_str.lines().collect();
                
                let mut printers = Vec::new();
                for line in lines.iter().skip(1) { // Skip header
                    if !line.trim().is_empty() {
                        let printer_name = line.trim_matches('"');
                        if !printer_name.trim().is_empty() {
                            printers.push(printer_name.to_string());
                        }
                    }
                }
                
                println!("✅ Detected all Windows printers: {:?}", printers);
                printers
            },
            Err(e) => {
                eprintln!("❌ Error getting Windows printers: {}", e);
                vec![]
            }
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        println!("🔍 Not on Windows, returning empty list");
        vec![]
    }
}

#[tauri::command]
fn print_ticket(ticket_data: String, printer_name: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::ptr;
        use winapi::um::winspool::{OpenPrinterW, ClosePrinter, StartDocPrinterW, EndDocPrinter, StartPagePrinter, EndPagePrinter, WritePrinter, DOC_INFO_1W};
        use winapi::um::handleapi::INVALID_HANDLE_VALUE;
        use winapi::um::errhandlingapi::GetLastError as WinGetLastError;
        
        unsafe {
            // Convert printer name to wide string
            let mut printer_name_wide: Vec<u16> = printer_name.encode_utf16().chain(std::iter::once(0)).collect();
            
            let mut printer_handle = INVALID_HANDLE_VALUE;
            
            // Open printer
            let result = OpenPrinterW(
                printer_name_wide.as_mut_ptr(),
                &mut printer_handle,
                ptr::null_mut()
            );
            
            if result == 0 {
                let error = WinGetLastError();
                return Err(format!("Failed to open printer '{}'. Error code: {}", printer_name, error));
            }
            
            // Prepare document info
            let mut doc_name: Vec<u16> = "Ticket".encode_utf16().chain(std::iter::once(0)).collect();
            let mut datatype: Vec<u16> = "RAW\0".encode_utf16().collect();
            let doc_info = DOC_INFO_1W {
                pDocName: doc_name.as_mut_ptr(),
                pOutputFile: ptr::null_mut(),
                pDatatype: datatype.as_mut_ptr(),
            };
            
            // Start document
            if StartDocPrinterW(printer_handle, 1, &doc_info as *const _ as *mut _) == 0 {
                let error = WinGetLastError();
                ClosePrinter(printer_handle);
                return Err(format!("Failed to start document. Error code: {}", error));
            }
            
            // Start page
            if StartPagePrinter(printer_handle) == 0 {
                let error = WinGetLastError();
                EndDocPrinter(printer_handle);
                ClosePrinter(printer_handle);
                return Err(format!("Failed to start page. Error code: {}", error));
            }
            
            // Write ticket data
            let ticket_bytes = ticket_data.as_bytes();
            let mut bytes_written: u32 = 0;
            
            let write_result = WritePrinter(
                printer_handle,
                ticket_bytes.as_ptr() as *mut _,
                ticket_bytes.len() as u32,
                &mut bytes_written
            );
            
            if write_result == 0 {
                let error = WinGetLastError();
                EndPagePrinter(printer_handle);
                EndDocPrinter(printer_handle);
                ClosePrinter(printer_handle);
                return Err(format!("Failed to write to printer. Error code: {}", error));
            }
            
            // End page and document
            if EndPagePrinter(printer_handle) == 0 {
                let error = WinGetLastError();
                EndDocPrinter(printer_handle);
                ClosePrinter(printer_handle);
                return Err(format!("Failed to end page. Error code: {}", error));
            }
            
            if EndDocPrinter(printer_handle) == 0 {
                let error = WinGetLastError();
                ClosePrinter(printer_handle);
                return Err(format!("Failed to end document. Error code: {}", error));
            }
            
            // Close printer
            ClosePrinter(printer_handle);
            
            println!("Successfully printed ticket to '{}'", printer_name);
            Ok(())
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Printing is only supported on Windows".to_string())
    }
}

#[tauri::command]
fn print_ticket_raw(ticket_data: String, printer_name: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::fs;
        use std::path::Path;
        
        // Create temp directory if it doesn't exist
        let temp_dir = Path::new("temp");
        if !temp_dir.exists() {
            fs::create_dir(temp_dir).map_err(|e| format!("Failed to create temp directory: {}", e))?;
        }
        
        // Create temp file with ticket data
        let temp_file = temp_dir.join(format!("ticket_{}.txt", std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis()));
        
        fs::write(&temp_file, ticket_data).map_err(|e| format!("Failed to write temp file: {}", e))?;
        
        // Use PowerShell to print the file
        let output = Command::new("powershell")
            .args(&[
                "-WindowStyle", "Hidden",
                "-NoProfile", 
                "-ExecutionPolicy", "Bypass",
                "-Command",
                &format!("Get-Content '{}' -Encoding UTF8 | Out-Printer -Name '{}'", 
                    temp_file.to_string_lossy().replace("\\", "\\\\"), 
                    printer_name.replace("'", "''"))
            ])
            .output();
        
        // Clean up temp file
        let _ = fs::remove_file(temp_file);
        
        match output {
            Ok(output) => {
                if output.status.success() {
                    println!("Successfully printed ticket to '{}'", printer_name);
                    Ok(())
                } else {
                    let error = String::from_utf8_lossy(&output.stderr);
                    Err(format!("Printing failed: {}", error))
                }
            },
            Err(e) => {
                Err(format!("Failed to execute print command: {}", e))
            }
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Printing is only supported on Windows".to_string())
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        // Fallback for non-Windows systems
        match serialport::available_ports() {
            Ok(ports) => {
                let usb_ports: Vec<String> = ports
                    .iter()
                    .filter(|p| {
                        let port_name = p.port_name.to_lowercase();
                        port_name.contains("usb") || port_name.contains("ttyusb")
                    })
                    .map(|p| p.port_name.clone())
                    .collect();
                
                println!("Detected USB ports (non-Windows): {:?}", usb_ports);
                usb_ports
            },
            Err(e) => {
                eprintln!("Error listing USB ports: {}", e);
                vec![]
            }
        }
    }
}

#[tauri::command]
fn list_com_printers() -> Vec<String> {
    // For Windows, get COM port printers
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        
        // Use PowerShell instead of wmic - more reliable in Tauri
        let output = Command::new("powershell")
            .args(&["-Command", "Get-Printer | Where-Object {$_.PortName -like '*COM*'} | Select-Object Name,PortName | ConvertTo-Csv -NoTypeInformation"])
            .output();
        
        match output {
            Ok(output) => {
                let output_str = String::from_utf8_lossy(&output.stdout);
                let lines: Vec<&str> = output_str.lines().collect();
                
                let mut printers = Vec::new();
                for line in lines.iter().skip(1) { // Skip header
                    if !line.trim().is_empty() {
                        let parts: Vec<&str> = line.split(',').collect();
                        if parts.len() >= 2 {
                            let printer_name = parts[0].trim_matches('"');
                            let port_name = parts[1].trim_matches('"');
                            
                            if !printer_name.trim().is_empty() {
                                printers.push(format!("{} ({})", printer_name, port_name));
                            }
                        }
                    }
                }
                
                println!("Detected Windows COM printers via PowerShell: {:?}", printers);
                printers
            },
            Err(e) => {
                eprintln!("Error getting Windows COM printers via PowerShell: {}", e);
                vec![]
            }
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        // Fallback for non-Windows systems
        match serialport::available_ports() {
            Ok(ports) => {
                let com_ports: Vec<String> = ports
                    .iter()
                    .filter(|p| {
                        let port_name = p.port_name.to_lowercase();
                        port_name.contains("com") || port_name.contains("ttys")
                    })
                    .map(|p| p.port_name.clone())
                    .collect();
                
                println!("Detected COM ports (non-Windows): {:?}", com_ports);
                com_ports
            },
            Err(e) => {
                eprintln!("Error listing COM ports: {}", e);
                vec![]
            }
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
fn test_printers() -> Vec<String> {
    // Simple test command that returns hardcoded data
    println!("🧪 Test printers command called");
    vec![
        "Test Printer 1 (USB001)".to_string(),
        "Test Printer 2 (COM1)".to_string(),
        "EPSON TM-T81 ReceiptE4 (USB002)".to_string()
    ]
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![start_backend, list_printers, list_usb_printers, list_com_printers, list_all_printers, test_printer_connection, print_ticket, print_ticket_raw, test_printers])
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

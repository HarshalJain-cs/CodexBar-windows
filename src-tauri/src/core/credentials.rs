use std::path::PathBuf;

/// Credential storage using Windows Credential Manager
pub struct CredentialStore {
    service_name: String,
}

impl CredentialStore {
    pub fn new() -> Self {
        Self {
            service_name: "CodexBar".to_string(),
        }
    }

    /// Store a credential in Windows Credential Manager
    pub fn set(&self, key: &str, value: &str) -> Result<(), String> {
        let entry = keyring::Entry::new(&self.service_name, key)
            .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
        entry
            .set_password(value)
            .map_err(|e| format!("Failed to store credential: {}", e))
    }

    /// Retrieve a credential from Windows Credential Manager
    pub fn get(&self, key: &str) -> Result<Option<String>, String> {
        let entry = keyring::Entry::new(&self.service_name, key)
            .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
        match entry.get_password() {
            Ok(value) => Ok(Some(value)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(format!("Failed to retrieve credential: {}", e)),
        }
    }

    /// Delete a credential from Windows Credential Manager
    pub fn delete(&self, key: &str) -> Result<(), String> {
        let entry = keyring::Entry::new(&self.service_name, key)
            .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
        match entry.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(format!("Failed to delete credential: {}", e)),
        }
    }
}

/// Read a JSON file from the user's home directory
pub fn read_home_json(relative_path: &str) -> Option<serde_json::Value> {
    let home = dirs::home_dir()?;
    let path: PathBuf = home.join(relative_path);
    let content = std::fs::read_to_string(&path).ok()?;
    serde_json::from_str(&content).ok()
}

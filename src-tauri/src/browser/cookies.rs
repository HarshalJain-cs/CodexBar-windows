use std::path::{Path, PathBuf};

use super::detection::{detect_browsers, BrowserType, DetectedBrowser};

/// Extract cookies for a given domain from installed browsers
pub async fn extract_cookies_for_domain(domain: &str) -> Result<String, String> {
    let browsers = detect_browsers();

    for browser in &browsers {
        match extract_from_browser(browser, domain) {
            Ok(Some(cookies)) => return Ok(cookies),
            Ok(None) => continue,
            Err(e) => {
                tracing::warn!(
                    "Failed to extract cookies from {}: {}",
                    browser.name,
                    e
                );
                continue;
            }
        }
    }

    Err(format!("No cookies found for {} in any browser", domain))
}

/// Extract cookies from a specific browser
fn extract_from_browser(
    browser: &DetectedBrowser,
    domain: &str,
) -> Result<Option<String>, String> {
    if browser.browser_type.is_chromium() {
        extract_chromium_cookies(&browser.profile_path, domain)
    } else {
        extract_firefox_cookies(&browser.profile_path, domain)
    }
}

/// Extract cookies from a Chromium-based browser (Chrome, Edge, Brave)
fn extract_chromium_cookies(
    user_data_path: &Path,
    domain: &str,
) -> Result<Option<String>, String> {
    // Read encryption key from Local State
    let local_state_path = user_data_path.join("Local State");
    let local_state = std::fs::read_to_string(&local_state_path)
        .map_err(|e| format!("Failed to read Local State: {}", e))?;

    let state_json: serde_json::Value = serde_json::from_str(&local_state)
        .map_err(|e| format!("Failed to parse Local State: {}", e))?;

    let encrypted_key_b64 = state_json
        .get("os_crypt")
        .and_then(|c| c.get("encrypted_key"))
        .and_then(|k| k.as_str())
        .ok_or("No encrypted_key in Local State")?;

    // Decode base64 key
    let encrypted_key_bytes = base64::engine::general_purpose::STANDARD
        .decode(encrypted_key_b64)
        .map_err(|e| format!("Failed to decode key: {}", e))?;

    // Remove "DPAPI" prefix (5 bytes)
    if encrypted_key_bytes.len() < 5 || &encrypted_key_bytes[0..5] != b"DPAPI" {
        return Err("Invalid encrypted key format".to_string());
    }
    let dpapi_blob = &encrypted_key_bytes[5..];

    // Decrypt using Windows DPAPI
    let decrypted_key = dpapi_decrypt(dpapi_blob)?;

    // Find cookie database - try Default profile first
    let profiles = ["Default", "Profile 1", "Profile 2", "Profile 3"];
    for profile in &profiles {
        let cookies_db = user_data_path.join(profile).join("Cookies");
        if !cookies_db.exists() {
            // Also try "Network" subfolder
            let network_db = user_data_path.join(profile).join("Network").join("Cookies");
            if network_db.exists() {
                if let Ok(Some(result)) =
                    read_chromium_cookie_db(&network_db, domain, &decrypted_key)
                {
                    return Ok(Some(result));
                }
            }
            continue;
        }
        if let Ok(Some(result)) = read_chromium_cookie_db(&cookies_db, domain, &decrypted_key) {
            return Ok(Some(result));
        }
    }

    Ok(None)
}

/// Read cookies from a Chromium SQLite database
fn read_chromium_cookie_db(
    db_path: &Path,
    domain: &str,
    key: &[u8],
) -> Result<Option<String>, String> {
    // Copy the database to a temp file (browser may have it locked)
    let temp_dir = std::env::temp_dir();
    let temp_db = temp_dir.join(format!("codexbar_cookies_{}.db", uuid::Uuid::new_v4()));
    std::fs::copy(db_path, &temp_db)
        .map_err(|e| format!("Failed to copy cookie db: {}", e))?;

    let result = (|| {
        let conn = rusqlite::Connection::open_with_flags(
            &temp_db,
            rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
        )
        .map_err(|e| format!("Failed to open cookie db: {}", e))?;

        let mut stmt = conn
            .prepare(
                "SELECT name, encrypted_value FROM cookies WHERE host_key LIKE ?1 OR host_key LIKE ?2",
            )
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let domain_pattern = format!("%{}", domain);
        let dot_domain = format!(".{}", domain);

        let cookies: Vec<(String, String)> = stmt
            .query_map(
                rusqlite::params![&domain_pattern, &dot_domain],
                |row| {
                    let name: String = row.get(0)?;
                    let encrypted_value: Vec<u8> = row.get(1)?;
                    Ok((name, encrypted_value))
                },
            )
            .map_err(|e| format!("Query failed: {}", e))?
            .filter_map(|r| r.ok())
            .filter_map(|(name, encrypted)| {
                decrypt_cookie_value(&encrypted, key)
                    .ok()
                    .map(|v| (name, v))
            })
            .collect();

        if cookies.is_empty() {
            return Ok(None);
        }

        let cookie_header: String = cookies
            .iter()
            .map(|(name, value)| format!("{}={}", name, value))
            .collect::<Vec<_>>()
            .join("; ");

        Ok(Some(cookie_header))
    })();

    // Clean up temp file
    let _ = std::fs::remove_file(&temp_db);

    result
}

/// Decrypt a Chromium cookie value using AES-256-GCM
fn decrypt_cookie_value(encrypted: &[u8], key: &[u8]) -> Result<String, String> {
    use aes_gcm::{
        aead::{Aead, KeyInit},
        Aes256Gcm, Nonce,
    };

    if encrypted.len() < 3 {
        return Err("Encrypted value too short".to_string());
    }

    // Check for v10/v20 prefix
    let (prefix, data) = if &encrypted[0..3] == b"v10" || &encrypted[0..3] == b"v20" {
        (&encrypted[0..3], &encrypted[3..])
    } else {
        // Old DPAPI-encrypted value
        return dpapi_decrypt(encrypted).and_then(|bytes| {
            String::from_utf8(bytes).map_err(|e| format!("UTF-8 decode error: {}", e))
        });
    };

    if data.len() < 12 + 16 {
        return Err("Encrypted data too short for AES-GCM".to_string());
    }

    // Split into nonce (12 bytes) and ciphertext+tag
    let nonce_bytes = &data[0..12];
    let ciphertext = &data[12..];

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Invalid key: {}", e))?;

    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    // Chrome 127+ may add a 32-byte prefix to the decrypted value
    let value = if plaintext.len() > 32 && prefix == b"v20" {
        &plaintext[32..]
    } else {
        &plaintext
    };

    String::from_utf8(value.to_vec()).map_err(|e| format!("UTF-8 decode error: {}", e))
}

/// Decrypt data using Windows DPAPI (CryptUnprotectData)
fn dpapi_decrypt(data: &[u8]) -> Result<Vec<u8>, String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Security::Cryptography::{
            CryptUnprotectData, CRYPT_INTEGER_BLOB,
        };

        unsafe {
            let mut input = CRYPT_INTEGER_BLOB {
                cbData: data.len() as u32,
                pbData: data.as_ptr() as *mut u8,
            };
            let mut output = CRYPT_INTEGER_BLOB {
                cbData: 0,
                pbData: std::ptr::null_mut(),
            };

            CryptUnprotectData(
                &mut input,
                None,
                None,
                None,
                None,
                0,
                &mut output,
            )
            .map_err(|_| "DPAPI CryptUnprotectData failed".to_string())?;

            let decrypted =
                std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();

            // Free the memory allocated by CryptUnprotectData
            let hlocal = windows::Win32::Foundation::HLOCAL(output.pbData as *mut _);
            let _ = windows::Win32::Foundation::LocalFree(hlocal);

            Ok(decrypted)
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("DPAPI is only available on Windows".to_string())
    }
}

/// Extract cookies from Firefox
fn extract_firefox_cookies(
    profiles_path: &Path,
    domain: &str,
) -> Result<Option<String>, String> {
    // Find the default profile (*.default-release or first directory)
    let entries: Vec<PathBuf> = std::fs::read_dir(profiles_path)
        .map_err(|e| format!("Failed to read Firefox profiles: {}", e))?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.is_dir())
        .collect();

    let profile = entries
        .iter()
        .find(|p| {
            p.file_name()
                .and_then(|n| n.to_str())
                .map(|n| n.ends_with(".default-release"))
                .unwrap_or(false)
        })
        .or_else(|| entries.first())
        .ok_or("No Firefox profile found")?;

    let cookies_db = profile.join("cookies.sqlite");
    if !cookies_db.exists() {
        return Ok(None);
    }

    // Copy to temp (Firefox locks the file)
    let temp_dir = std::env::temp_dir();
    let temp_db = temp_dir.join(format!("codexbar_ff_cookies_{}.db", uuid::Uuid::new_v4()));
    std::fs::copy(&cookies_db, &temp_db)
        .map_err(|e| format!("Failed to copy Firefox cookies: {}", e))?;

    let result = (|| {
        let conn = rusqlite::Connection::open_with_flags(
            &temp_db,
            rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
        )
        .map_err(|e| format!("Failed to open Firefox cookie db: {}", e))?;

        let mut stmt = conn
            .prepare("SELECT name, value FROM moz_cookies WHERE host LIKE ?1 OR host LIKE ?2")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let domain_pattern = format!("%{}", domain);
        let dot_domain = format!(".{}", domain);

        let cookies: Vec<(String, String)> = stmt
            .query_map(rusqlite::params![&domain_pattern, &dot_domain], |row| {
                let name: String = row.get(0)?;
                let value: String = row.get(1)?;
                Ok((name, value))
            })
            .map_err(|e| format!("Query failed: {}", e))?
            .filter_map(|r| r.ok())
            .collect();

        if cookies.is_empty() {
            return Ok(None);
        }

        let cookie_header: String = cookies
            .iter()
            .map(|(name, value)| format!("{}={}", name, value))
            .collect::<Vec<_>>()
            .join("; ");

        Ok(Some(cookie_header))
    })();

    let _ = std::fs::remove_file(&temp_db);

    result
}

use base64::Engine;

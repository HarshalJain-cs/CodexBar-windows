use std::path::PathBuf;

/// Supported browser types
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BrowserType {
    Chrome,
    Edge,
    Brave,
    Firefox,
}

/// A detected browser installation
#[derive(Debug, Clone)]
pub struct DetectedBrowser {
    pub browser_type: BrowserType,
    pub profile_path: PathBuf,
    pub name: &'static str,
}

impl BrowserType {
    pub fn is_chromium(&self) -> bool {
        matches!(self, BrowserType::Chrome | BrowserType::Edge | BrowserType::Brave)
    }
}

/// Detect all installed browsers on Windows
pub fn detect_browsers() -> Vec<DetectedBrowser> {
    let mut browsers = Vec::new();
    let local_app_data = dirs::data_local_dir().unwrap_or_default();
    let app_data = dirs::config_dir().unwrap_or_default();

    // Chrome
    let chrome_path = local_app_data.join("Google").join("Chrome").join("User Data");
    if chrome_path.exists() {
        browsers.push(DetectedBrowser {
            browser_type: BrowserType::Chrome,
            profile_path: chrome_path,
            name: "Chrome",
        });
    }

    // Edge
    let edge_path = local_app_data.join("Microsoft").join("Edge").join("User Data");
    if edge_path.exists() {
        browsers.push(DetectedBrowser {
            browser_type: BrowserType::Edge,
            profile_path: edge_path,
            name: "Edge",
        });
    }

    // Brave
    let brave_path = local_app_data
        .join("BraveSoftware")
        .join("Brave-Browser")
        .join("User Data");
    if brave_path.exists() {
        browsers.push(DetectedBrowser {
            browser_type: BrowserType::Brave,
            profile_path: brave_path,
            name: "Brave",
        });
    }

    // Firefox
    let firefox_path = app_data.join("Mozilla").join("Firefox").join("Profiles");
    if firefox_path.exists() {
        browsers.push(DetectedBrowser {
            browser_type: BrowserType::Firefox,
            profile_path: firefox_path,
            name: "Firefox",
        });
    }

    browsers
}

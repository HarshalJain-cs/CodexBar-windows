/// System sound effects for notifications and alerts.
/// Uses user32.dll MessageBeep via FFI.

#[cfg(windows)]
mod ffi {
    #[link(name = "user32")]
    extern "system" {
        pub fn MessageBeep(uType: u32) -> i32;
    }
}

#[cfg(windows)]
pub fn play_warning() {
    // MB_ICONWARNING = 0x30
    unsafe { ffi::MessageBeep(0x30); }
}

#[cfg(windows)]
pub fn play_critical() {
    // MB_ICONERROR = 0x10
    unsafe { ffi::MessageBeep(0x10); }
}

#[cfg(windows)]
pub fn play_success() {
    // MB_ICONINFORMATION = 0x40
    unsafe { ffi::MessageBeep(0x40); }
}

#[cfg(not(windows))]
pub fn play_warning() {}
#[cfg(not(windows))]
pub fn play_critical() {}
#[cfg(not(windows))]
pub fn play_success() {}

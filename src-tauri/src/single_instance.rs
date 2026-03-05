/// Single instance guard using Windows named mutex.
/// Prevents multiple instances of CodexBar from running simultaneously.

#[cfg(windows)]
pub struct SingleInstanceGuard {
    _handle: windows::Win32::Foundation::HANDLE,
}

#[cfg(windows)]
impl SingleInstanceGuard {
    const MUTEX_NAME: &'static str = "Local\\CodexBar_SingleInstance_Mutex";

    /// Try to acquire the single instance lock.
    /// Returns Ok(guard) if this is the first instance, Err if another is running.
    pub fn acquire() -> Result<Self, String> {
        use windows::core::PCSTR;
        use windows::Win32::Foundation::GetLastError;
        use windows::Win32::System::Threading::CreateMutexA;

        let name = std::ffi::CString::new(Self::MUTEX_NAME)
            .map_err(|e| format!("Invalid mutex name: {}", e))?;

        unsafe {
            let handle = CreateMutexA(None, true, PCSTR(name.as_ptr() as *const u8))
                .map_err(|e| format!("CreateMutex failed: {}", e))?;

            let last_error = GetLastError();
            // ERROR_ALREADY_EXISTS = 183
            if last_error.0 == 183 {
                let _ = windows::Win32::Foundation::CloseHandle(handle);
                return Err("Another instance of CodexBar is already running".to_string());
            }

            Ok(Self { _handle: handle })
        }
    }
}

#[cfg(windows)]
impl Drop for SingleInstanceGuard {
    fn drop(&mut self) {
        unsafe {
            let _ = windows::Win32::System::Threading::ReleaseMutex(self._handle);
            let _ = windows::Win32::Foundation::CloseHandle(self._handle);
        }
    }
}

#[cfg(not(windows))]
pub struct SingleInstanceGuard;

#[cfg(not(windows))]
impl SingleInstanceGuard {
    pub fn acquire() -> Result<Self, String> {
        Ok(Self)
    }
}

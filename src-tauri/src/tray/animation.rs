/// Loading animation patterns
#[derive(Debug, Clone, Copy)]
pub enum LoadingPattern {
    KnightRider,
}

/// Animation state machine
pub struct AnimationState {
    pub frame: usize,
    pub is_loading: bool,
    pub pattern: LoadingPattern,
}

impl AnimationState {
    pub fn new() -> Self {
        Self {
            frame: 0,
            is_loading: false,
            pattern: LoadingPattern::KnightRider,
        }
    }

    pub fn advance(&mut self) {
        if self.is_loading {
            self.frame = self.frame.wrapping_add(1);
        }
    }

    pub fn start_loading(&mut self) {
        self.is_loading = true;
        self.frame = 0;
    }

    pub fn stop_loading(&mut self) {
        self.is_loading = false;
    }
}

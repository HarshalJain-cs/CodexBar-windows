/// Render a 32x32 RGBA tray icon with dual usage bars
pub fn create_bar_icon(session_percent: f64, weekly_percent: f64) -> Vec<u8> {
    let size: usize = 32;
    let mut pixels = vec![0u8; size * size * 4];

    let margin = 3;
    let bar_width = size - margin * 2;

    // Top bar: session usage (rows 5-14)
    let top_start = 5;
    let top_end = 14;

    // Bottom bar: weekly usage (rows 18-25)
    let bot_start = 18;
    let bot_end = 25;

    let session_fill = ((session_percent / 100.0) * bar_width as f64).round() as usize;
    let weekly_fill = ((weekly_percent / 100.0) * bar_width as f64).round() as usize;

    for y in 0..size {
        for x in 0..size {
            let i = (y * size + x) * 4;

            if x >= margin && x < margin + bar_width {
                let bar_x = x - margin;

                if y >= top_start && y < top_end {
                    // Session bar
                    if bar_x < session_fill {
                        let (r, g, b) = color_for_percent(session_percent);
                        pixels[i] = r;
                        pixels[i + 1] = g;
                        pixels[i + 2] = b;
                        pixels[i + 3] = 255;
                    } else {
                        // Empty portion (dark gray)
                        pixels[i] = 60;
                        pixels[i + 1] = 60;
                        pixels[i + 2] = 60;
                        pixels[i + 3] = 180;
                    }
                } else if y >= bot_start && y < bot_end {
                    // Weekly bar
                    if bar_x < weekly_fill {
                        let (r, g, b) = color_for_percent(weekly_percent);
                        pixels[i] = r;
                        pixels[i + 1] = g;
                        pixels[i + 2] = b;
                        pixels[i + 3] = 255;
                    } else {
                        pixels[i] = 60;
                        pixels[i + 1] = 60;
                        pixels[i + 2] = 60;
                        pixels[i + 3] = 180;
                    }
                }
            }
        }
    }

    pixels
}

/// Create a loading animation frame
pub fn create_loading_icon(frame: usize) -> Vec<u8> {
    let size: usize = 32;
    let mut pixels = vec![0u8; size * size * 4];

    let margin = 3;
    let bar_width = size - margin * 2;
    let top_start = 5;
    let top_end = 14;
    let bot_start = 18;
    let bot_end = 25;

    // Knight Rider animation: a bright segment bounces left-right
    let segment_width = 6;
    let max_pos = bar_width - segment_width;
    let cycle = max_pos * 2;
    let pos = if cycle == 0 {
        0
    } else {
        let p = frame % cycle;
        if p < max_pos {
            p
        } else {
            cycle - p
        }
    };

    for y in 0..size {
        for x in 0..size {
            let i = (y * size + x) * 4;

            if x >= margin && x < margin + bar_width {
                let bar_x = x - margin;

                if (y >= top_start && y < top_end) || (y >= bot_start && y < bot_end) {
                    if bar_x >= pos && bar_x < pos + segment_width {
                        // Bright cyan segment
                        pixels[i] = 34;
                        pixels[i + 1] = 211;
                        pixels[i + 2] = 238;
                        pixels[i + 3] = 255;
                    } else {
                        // Dim background
                        pixels[i] = 40;
                        pixels[i + 1] = 40;
                        pixels[i + 2] = 40;
                        pixels[i + 3] = 120;
                    }
                }
            }
        }
    }

    pixels
}

/// Get RGB color for a usage percentage
/// Green (low) -> Yellow (medium) -> Orange (high) -> Red (critical)
fn color_for_percent(percent: f64) -> (u8, u8, u8) {
    match percent {
        p if p >= 95.0 => (239, 68, 68),   // Red
        p if p >= 80.0 => (249, 115, 22),  // Orange
        p if p >= 50.0 => (234, 179, 8),   // Yellow
        _ => (34, 197, 94),                 // Green
    }
}

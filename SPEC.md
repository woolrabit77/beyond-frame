# YouTube Background Expand 0.1

## Seam-only correction 0.1.3
- Fix the visible offset between the source video and expanded background when scrollbar widths or display scaling differ.
- Measure the actual canvas screen bounds and local CSS dimensions, using the same coordinates for the shader and the transparent mask.
- Recalculate when the canvas size changes, including while the video is paused. Preserve fullscreen placement.
- Fill the white corner gaps by removing player/video corner clipping while the background is enabled; restore the original rounding when disabled.
- Preserve popup UI, translations, settings, permissions, reflection/blur algorithm and the 30fps background budget.

## Popup restyle 0.1.2
- Restyle only the extension popup in Apple's light Settings visual language.
- Preserve enable, blur, brightness, quality, local storage, privacy link, and live status behavior.
- Use neutral gray background, white grouped controls, green switch, blue slider fill, system typography.
- Fit the ordinary playing state within Chrome's 600px popup height and remain usable at 320px width.
- Preserve keyboard labels/focus, readable waiting/error states, and reduced motion support.
- No developer registration, upload or publication.

## Additional functional changes 0.1.2
- Correct left/right subpixel seams independently of render quality: preserve the exact CSS video boundary and avoid transparent upscaling bleed.
- Reflect only the nearest 20% edge strip once, at 1:1 displayed scale. Beyond the reflected strip, hold its final edge color and apply progressive blur. No compression or repeated mirroring.
- Remove page/device white player decoration (not white pixels inside the source video). Show the expanded background behind the YouTube masthead/search surroundings while keeping search controls legible and usable. Restore page styling when disabled.
- Localize popup, manifest, status/errors and privacy notice using Chrome UI language: Korean, English, Japanese, Simplified Chinese, Spanish, French, German, Brazilian Portuguese, Indonesian and Vietnamese. Fall back to English. No network translation or added permission.
- Keep existing local settings, original video/audio/controls, pause/hidden behavior and the maximum 30fps update budget.

- Chrome Manifest V3 extension, local processing, no AI, server, video download or tab capture.
- Fill the browser viewport outside the active YouTube video's actual displayed frame, including the YouTube player fullscreen mode.
- Keep original video, audio, controls, captions, resolution and playback rate intact.
- Use WebGL to extend the source edges and progressively blur farther away. Target at most 30 background updates per second; original video frame rate stays unchanged.
- Pause background work on hidden tabs, paused video, ended video and disabled extension. Refresh on seek, resize and fullscreen changes.
- Select the main visible player, handle YouTube SPA navigation and video replacement, and release GPU resources when disabled.
- Popup controls: enabled, blur, brightness, quality. Save locally. Status must report unavailable WebGL or inaccessible video frames without breaking playback.
- Test actual renderer, fullscreen layering, original-frame transparency, pause/resume, replacement, settings, frame-rate limit and graceful failure in a local browser harness. Live Chrome/YouTube compatibility and hardware GPU performance are distinct validation steps.

# VideoPlayer UI/UX Layout Audit — 20 Suggestions

## Bottom bar (seek bar + controls)

1. **Unify into a single cohesive bottom bar** — The seek bar and controls row are separated by padding. Merge them into one visually continuous panel with a dark gradient scrim background (like YouTube's bottom shadow).

2. **Seek bar on top of the bottom bar, not floating above it** — Currently it's inside `space-y-2` above the controls. Make it the top edge of the bottom bar so it spans the full width seamlessly.

3. **Remove the `bg-black/30` overlay** — It uniformly dims the entire video. Replace with a bottom gradient scrim (`bg-gradient-to-t from-black/80 via-black/20 to-transparent`) so only the bottom area gets dark, keeping the video bright.

4. **Keep the seek bar thumb always visible** — The white circle handle is `opacity-0 group-hover:opacity-100`. Change to always show it at a smaller size, enlarge on hover.

5. **Time display below the seek bar** — Like YouTube: current time on left side of the bar, duration on the right side, making the bar the focal point.

## Center controls

6. **Big centered play button only when paused** — Remove it from the always-visible controls. Show a large translucent play icon in the center only when the video is paused (like Netflix/YouTube).

7. **Remove the center rewind/forward buttons** — They duplicate the double-tap gesture and clutter the screen. Keep them in the bottom controls row instead.

8. **Reduce center controls size on mobile** — `playbackControlSize` is `w-10 h-10 sm:w-12 sm:h-12`. On phones ≤ 400px wide, shrink to `w-8 h-8`.

## Playback speed

9. **Move playback speed from top-right to bottom bar** — It's isolated at the top. Move it to the bottom right as a compact pill button (e.g., `1x`). Tapping it cycles through speeds instead of showing a slider.

10. **Alternatively, keep speed at top but add a subtle gradient** — The white text slider on bright video is hard to read. Add a dark semi-transparent background behind the speed control.

## Volume

11. **Add a horizontal volume slider** — Right next to the mute icon. Keep it hidden until hover/tap, then slide out. Shows the volume level at a glance.

## Autoplay toggle

12. **Compact the autoplay toggle** — The 48px wide toggle switch is bulky. Replace with a small icon button (like a loop icon) that changes color to indicate active/inactive.

## Controls row order

13. **Reorder bottom controls for logical grouping** — Current: play, mute, time | autoplay, PiP, fullscreen. Suggested: play, rewind/forward (grouped), | time display, | volume, | PiP, fullscreen (grouped).

14. **Add a visual separator between playback and window controls** — A thin vertical line `|` or a `w-px h-5 bg-white/20` divider between time and PiP.

## Seek bar

15. **Add 10-second step markers** — Small dots on the seek bar every 10 seconds to give a sense of video length and position.

16. **Thumbnail preview should also update on scrubbing** — Currently the preview only shows on hover. When dragging the seek thumb, show the preview at the current drag position too.

## Info overlay

17. **Show video resolution/quality** — Small badge in the top-left corner showing "1080p", "720p", etc. (if available from props).

18. **Add keyboard shortcut hints** — First time controls show, briefly display "Space: Play/Pause" and "← →: Seek" as small labels.

## Mobile-specific

19. **Thumbnail preview on touch scrub** — On mobile, the drag handles on the seek bar don't show the preview. Show a larger preview above the thumb during drag.

20. **Swap long-press and double-tap zones** — Double-tap left/right for +/-10s is good. Consider long-press left side = rewind continuously, right side = fast-forward continuously (like Instagram Reels).

# order-sound

Add persistent order notification sound.

## Steps

1. Read existing `src/lib/sound.ts` for current sound logic
2. Create a looping alert sound that plays on new order
3. Loop until manually stopped (no auto-stop)
4. Prevent overlap — only one sound at a time
5. Use Web Audio API or HTML5 `<audio>` with `loop` attribute
6. Add mute/unmute toggle visible during active alert
7. Integrate with order-alert modal — sound starts on alert, stops on accept
8. Build and verify

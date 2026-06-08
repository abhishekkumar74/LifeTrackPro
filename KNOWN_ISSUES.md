# Known Issues & Deferred Features

## Known Limitations

- **Local Recurring Notification Triggers**: Local recurring notifications (like daily study and habit reminders) require a physical iOS or Android device. On simulators, notification registration is mocked, and triggers will only output diagnostic warnings to the terminal console.
- **Auto-Dismiss Toast Timing**: The custom sliding toast is currently set to dismiss after 3 seconds. Under very fast user actions, new toasts will override the current active toast.
- **Offline Ephemeral Chat**: Ephemeral study room chat messages are not persisted in the database. If a user disconnects or refreshes their room, they will lose previous message history.

## Platform-Specific Quirks

- **Android Status Bar Edges**: Depending on the specific device model, the Android Status Bar might slightly overlap dark-themed rooms. We use `SafeAreaView` to prevent overlap on notch devices.
- **Android Keyboard Avoiding View**: The input keyboard in the study room's discussion chat is handled via `KeyboardAvoidingView`. Different Android keyboard heights or custom vendor keypads may result in minor layout shifts.


## Security & Vulnerabilities

- **PostCSS Vulnerability (Moderate - GHSA-qx2v-qp2m-jg93)**: Metro config uses PostCSS which has a moderate advisory for XSS via unescaped output. Since it is nested deep within Metro/Expo configurations, updating it requires upgrading Expo to SDK 56, which contains breaking API changes.
- **UUID Vulnerability (Moderate - GHSA-w5hq-g745-h8pq)**: Nested dependency in expo-constants and ngrok configuration. Fixing this requires updating to SDK 56. Safe to defer as bounds check bounds are not reachable under current usage.

## Deferred Features

- **Avatar Storage & Upload**: The user profile avatar currently displays user initials. The `expo-image` library is installed and configured, ready to optimize image loading and caching as soon as a file storage provider (like Supabase Storage) and upload UI are implemented.
- **Audio Files Compression**: Sound effects in `assets/sounds/` (`cafe.mp3` @ 2.0MB, `lofi.mp3` @ 2.6MB, and `rain.mp3` @ 2.3MB) currently exceed the 1.5MB recommended limit. Automatic compression during the build process is deferred because `ffmpeg` is not present in the local execution environment. These files should be compressed manually before production build bundling using:
  `ffmpeg -i input.mp3 -b:a 96k output.mp3`


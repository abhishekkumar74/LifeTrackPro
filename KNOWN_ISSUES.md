# Known Issues & Deferred Features

## Known Limitations

- **Local Recurring Notification Triggers**: Local recurring notifications (like daily study and habit reminders) require a physical iOS or Android device. On simulators, notification registration is mocked, and triggers will only output diagnostic warnings to the terminal console.
- **Auto-Dismiss Toast Timing**: The custom sliding toast is currently set to dismiss after 3 seconds. Under very fast user actions, new toasts will override the current active toast.
- **Offline Ephemeral Chat**: Ephemeral study room chat messages are not persisted in the database. If a user disconnects or refreshes their room, they will lose previous message history.

## Platform-Specific Quirks

- **Android Status Bar Edges**: Depending on the specific device model, the Android Status Bar might slightly overlap dark-themed rooms. We use `SafeAreaView` to prevent overlap on notch devices.
- **Android Keyboard Avoiding View**: The input keyboard in the study room's discussion chat is handled via `KeyboardAvoidingView`. Different Android keyboard heights or custom vendor keypads may result in minor layout shifts.

## Deferred Features

- **Avatar Image Storage Upload**: Remote storage uploads for user avatar images to Supabase storage are deferred to the next release. Currently, avatar selections are saved in local cache only.
- **Archived Habits Section**: Habits can be archived (setting `is_active` to `false`). The UI to view and restore archived habits will be built in the next version.

## Security & Vulnerabilities

- **PostCSS Vulnerability (Moderate - GHSA-qx2v-qp2m-jg93)**: Metro config uses PostCSS which has a moderate advisory for XSS via unescaped output. Since it is nested deep within Metro/Expo configurations, updating it requires upgrading Expo to SDK 56, which contains breaking API changes.
- **UUID Vulnerability (Moderate - GHSA-w5hq-g745-h8pq)**: Nested dependency in expo-constants and ngrok configuration. Fixing this requires updating to SDK 56. Safe to defer as bounds check bounds are not reachable under current usage.

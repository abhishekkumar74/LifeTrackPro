<div align="center">

<img src="https://img.shields.io/badge/Platform-iOS%20%7C%20Android-17172A?style=for-the-badge&logo=react&logoColor=white" />
<img src="https://img.shields.io/badge/Expo-SDK%2051-000020?style=for-the-badge&logo=expo&logoColor=white" />
<img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
<img src="https://img.shields.io/badge/Status-Pre--Development-E8A020?style=for-the-badge" />

<br /><br />

# LifeTrack Pro

### *Your Life Operating System*

**One app. Every goal. Zero excuses.**

LifeTrack Pro unifies goal-setting, daily scheduling, focus sessions, knowledge management, and community accountability — built for ambitious Indians who are tired of juggling 5 apps and still falling behind.

[📱 Download](#) · [📖 Docs](#) · [🐛 Report Bug](https://github.com/abhishekkumar74/LifeTrackPro/issues) · [💡 Request Feature](https://github.com/abhishekkumar74/LifeTrackPro/issues)

</div>

---

## 🎯 The Problem

Indian students and young professionals face three compounding problems:

| Problem | Reality |
|---|---|
| **Fragmented tools** | Notes in one app, tasks in another, timer elsewhere, goals nowhere |
| **Digital distraction** | Average Indian spends 4.5+ hours/day on social media — directly competing with deep work |
| **No accountability** | Goals are set but never tracked against daily behavior — course deviation is noticed too late |

---

## ✨ The Solution

LifeTrack Pro solves the **whole system**, not just one piece of it.

A NEET aspirant can store their syllabus, plan their week, block distracting apps, join a live group study room, and see whether they're on pace to clear their exam — **all without leaving the app.**

> **Vision:** Every person in India has a structured, focused path to their biggest goal.  
> **Mission:** Remove friction between intention and execution for **10 million users by 2027.**

---

## 👥 Who It's For

| Segment | Profile | Primary Need |
|---|---|---|
| 🎓 **Student** (60%) | 16–25, NEET/JEE/UPSC/CAT/GATE/SSC/CLAT aspirant | Syllabus tracker + focus timer + exam countdown |
| 💼 **Employee** (20%) | 24–40, side goal alongside 9-to-5 | Separate work vs. personal goal time |
| 🎨 **Creator** (10%) | 20–32, YouTuber / designer / developer | Content calendar + posting streak |
| 🚀 **Entrepreneur** (7%) | 24–38, founder / business owner | Top 3 big rocks + deep work tracking |
| 🏫 **Educator** (3%) | Teacher / coach running batches | Batch management + student progress visibility |

---

## 🚀 Features

<details>
<summary><strong>🧭 Personalised Onboarding (5 screens)</strong></summary>

- Profile type selection: Student, Employee, Creator, Entrepreneur, Educator, Aspirant
- Conditional sub-category (e.g. Students pick exams: NEET, JEE, UPSC, CAT…)
- Big goal input with timeline picker (3M / 6M / 1Y / 2Y / 5Y)
- Daily hours dial + peak productivity time
- Summary confirmation card → all saved to Supabase atomically

</details>

<details>
<summary><strong>🏠 Home Dashboard — 7 Action Zones</strong></summary>

| Zone | Component | Purpose |
|---|---|---|
| A | Sticky Header | Avatar + greeting + streak badge + notifications |
| B | Today's Focus Card | Top priority task → one tap to start focus session |
| C | Quick Stats Row | Focus hours / Tasks done / Habit streak |
| D | Schedule Strip | Next 2 upcoming time blocks |
| E | Habit Row | Top 5 habits as inline checkboxes |
| F | Goal Progress Bar | Goal name + progress ring + days left |
| G | AI Insight Card | Smart nudge from AI coach (dismissable) |

**Rule:** Start your most important task in **≤2 taps** from home.

</details>

<details>
<summary><strong>🏆 Goal Vault</strong></summary>

- 4-level hierarchy: Big Goal → Milestones → Weekly Tasks → Daily Items
- Auto on-track calculation: 🟢 On Track / 🟡 At Risk / 🔴 Behind
- Swipe right to complete, swipe left to reschedule
- Animated progress rings on screen entry
- Weekly reflection journal (prompted every Sunday at 9 PM)

</details>

<details>
<summary><strong>⏱️ Focus Mode</strong></summary>

- Pomodoro presets: 25/5, 50/10, 90/20 + fully custom
- Session goal text field for micro-commitment before starting
- 5 ambient soundscapes: Rain, Café, Ocean, Lo-fi, Brown Noise
- Background audio on both iOS and Android (even when minimised)
- **App Blocker:** Android via Accessibility Service; iOS via Screen Time API
- End-of-session summary with mood rating + accomplishment log

</details>

<details>
<summary><strong>📚 Notes & Knowledge Hub</strong></summary>

**Tab 1 — Syllabus Tracker**
- Subject → Chapter → Topic hierarchy
- Topic status: Not Started / In Progress / Done / Needs Revision
- Auto-calculated completion % per subject

**Tab 2 — Notes**
- Rich text editor with auto-save (debounced 2s)
- Image attachments via camera or gallery → Supabase Storage
- Spaced repetition: amber highlight for notes due for revision today

**Tab 3 — Flashcards**
- SM-2 spaced repetition algorithm
- Tinder-style swipe: ✅ Got it / 🔄 Review again
- Auto-generate from notes or create manually

</details>

<details>
<summary><strong>✅ Task Manager</strong></summary>

- Views: Today / Upcoming / Completed
- Priority system: 🔴 Urgent / 🟡 Important / ⚪ Normal
- Swipe gestures: right = complete (green flash), left = reschedule
- Recurring tasks with custom day patterns
- Quick add FAB: title + priority only (rest optional)

</details>

<details>
<summary><strong>🔥 Habit Tracker</strong></summary>

- Create habits with emoji + name + custom frequency
- Top 5 habits on home screen as inline toggles
- Streak calculation with consecutive-day logic
- Calendar heatmap showing all-time completions
- Soft-delete (archive) to preserve history

</details>

<details>
<summary><strong>📅 Routine Maker & Scheduler</strong></summary>

- Drag-to-create time blocks, drag edges to resize
- Pre-built templates: NEET 10hr plan, Corporate 9-to-5, Creator week
- Recurring daily/weekly blocks
- Morning brief notification at 8 AM with today's top 3 blocks

</details>

<details>
<summary><strong>👥 Group Study Rooms</strong></summary>

- Live rooms with real-time member presence (Supabase Realtime)
- Room types: Silent 🔇 / Music 🎵 / Discussion 💬
- Shared Pomodoro timer synced across all members
- Ephemeral in-room chat (not stored)
- Public room discovery + private invite-link rooms

</details>

<details>
<summary><strong>📊 Analytics & Progress</strong></summary>

- 90-day GitHub-style focus heatmap
- 7-day bar chart with average line overlay
- Subject distribution donut chart
- Achievement badges: "30-Day Streak", "100hr Focus Club", "Syllabus Crusher"
- Burnout detector: 3 low-mood days + streak break → rest recommendation

</details>

<details>
<summary><strong>🤖 AI Coach (Claude API)</strong></summary>

- Weekly on-track analysis via Supabase Edge Function
- Auto-generated Sunday review report
- Pattern detection (skipped subjects/days)
- Burnout early warning
- Displayed as a single-line card on home; full view in Profile → AI Insights

</details>

---

## 🎨 Design System

**Philosophy: Calm Productivity** — the UI must not add visual stress to users already under academic and professional pressure.

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| Background | `#F7F6F3` | App background (warm white) |
| Surface | `#FFFFFF` | Cards, modals, sheets |
| Navy | `#17172A` | Hero cards, focus screen, primary headings |
| Violet | `#5B4FE8` | CTAs, active nav, progress rings |
| Mint | `#00B894` | Success, completed, on-track |
| Amber | `#E8A020` | Streaks, warnings, AI nudge |
| Coral | `#E85858` | Errors, danger, blocker active |

### Typography

| Role | Font | Usage |
|---|---|---|
| Display | Instrument Serif | Screen titles, hero headings, goal names |
| UI | DM Sans | All interface text, labels, buttons |
| Numbers | DM Mono | Timers, statistics, streaks, percentages |

### Spacing
- Card border-radius: `16px` · Button border-radius: `12px`
- Card padding: `20px` · Section gap: `24px` · Screen margin: `20px`
- Min touch target: `48×48px`

---

## 🛠️ Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 51 |
| Language | TypeScript (strict mode) |
| Styling | NativeWind v4 (Tailwind for RN) |
| Navigation | Expo Router v3 (file-based) |
| State | Zustand (local) + React Query v5 (server) |
| Animations | React Native Reanimated v3 (60fps) |
| Audio | expo-av (ambient sounds + background play) |
| Gestures | react-native-gesture-handler |
| Charts | react-native-svg |
| Bottom Sheets | react-native-bottom-sheet |

### Backend

| Layer | Technology |
|---|---|
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime Presence (study rooms) |
| Storage | Supabase Storage (note images) |
| Edge Functions | Supabase Edge Functions (AI coach job) |
| AI | Claude API (insights & weekly review) |

---

## 📐 Business Logic

### On-Track Calculation
```
expected_ratio = days_elapsed / days_total
actual_ratio   = tasks_completed / total_tasks

actual ≥ expected × 0.90  →  🟢 On Track
actual ≥ expected × 0.70  →  🟡 At Risk
else                       →  🔴 Behind
```

### SM-2 Spaced Repetition (Flashcards & Notes)
```
quality 0–2  →  reset: repetitions=0, interval=1 day
quality 3–5  →  success:
  rep=0: interval=1d  |  rep=1: interval=6d  |  else: interval × ease_factor
  ease_factor = max(1.3, ease_factor + 0.1 − (5−quality) × (0.08 + (5−quality) × 0.02))
```

### Streak Calculation
```
Walk habit_logs descending from today.
Count consecutive days where done=true.
Break on first gap or done=false.
```

---

## 📁 Project Structure

```
app/
├── (auth)/
│   ├── login.tsx
│   ├── verify-otp.tsx
│   └── onboarding/
│       ├── index.tsx          # Step manager
│       └── steps/             # 5 step components
├── (tabs)/
│   ├── index.tsx              # Home Dashboard
│   ├── goals.tsx              # Goal Vault
│   ├── focus.tsx              # Focus Mode
│   ├── learn.tsx              # Notes + Syllabus
│   └── stats.tsx              # Analytics
├── rooms/
│   ├── index.tsx              # Room list
│   └── [id].tsx               # Active study room
└── note/
    └── [id].tsx               # Full-screen note editor

lib/
├── utils/
│   ├── on-track.ts            # Goal on-track calculation
│   ├── spaced-rep.ts          # SM-2 algorithm
│   └── streak.ts              # Habit streak logic
├── supabase/                  # Typed Supabase client
└── stores/                    # Zustand stores

constants/
├── theme.ts                   # All design tokens (no magic numbers)
└── strings.ts                 # All copy (no hardcoded strings)
```

---

## 📋 Code Standards

- **TypeScript strict**: no `any`, all props typed, all returns typed
- One component per file
- `StyleSheet.create()` only — no inline styles
- Every screen: loading skeleton + error state + empty state
- All async operations: `try/catch` with user-friendly error messages
- No hardcoded strings → `constants/strings.ts`
- No magic numbers → `constants/theme.ts`
- No PII in logs or error messages

---

## 💰 Monetisation

| Tier | Price | Features |
|---|---|---|
| **Free** | ₹0 | Core goal tracking, basic focus timer, 5 habits, 1 study room |
| **Pro** | ₹99/month | AI coach, ambient sound mixing, unlimited habits, advanced analytics |
| **Batch** | ₹499/month | Educator tools, batch management, student progress dashboard |

**Target:** India first → Southeast Asia → Global

---

## 🗺️ Roadmap

- [x] Project architecture & design system
- [ ] Onboarding flow
- [ ] Home dashboard
- [ ] Goal Vault
- [ ] Focus Mode with ambient audio
- [ ] Task Manager
- [ ] Habit Tracker
- [ ] Syllabus Tracker + Notes + Flashcards
- [ ] Routine Maker & Scheduler
- [ ] Analytics & heatmap
- [ ] Group Study Rooms (Realtime)
- [ ] AI Coach integration (Claude API)
- [ ] App Store & Play Store release
- [ ] Gamification (XP, levels, badges)

---

## 🤝 Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👨‍💻 Author

**Abhishek Kumar**  
[GitHub](https://github.com/abhishekkumar74) · [LinkedIn](https://www.linkedin.com/in/abhishekkumar74/)

---

<div align="center">

Built with ❤️ for every ambitious Indian who refuses to settle.

**⭐ Star this repo if LifeTrack Pro resonates with your journey.**

</div>

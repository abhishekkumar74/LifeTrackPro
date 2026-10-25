import csv
import json

reviews_data = [
    # Category 1: Syllabus Tracker & Progress (1-10)
    (
        "Syllabus Tracking & Progress",
        "UPSC Aspirant",
        "syllabus tracker app, exam preparation, topic completion, study progress tracker",
        "Best syllabus tracker for competitive exams!",
        "Managing the massive UPSC syllabus was overwhelming until I found LifeTrack Pro. The topic-wise syllabus breakdown and percentage progress bar keep me grounded every single day. I can see exactly how much history and polity I've completed. Essential app for any serious aspirant!"
    ),
    (
        "Syllabus Tracking & Progress",
        "JEE / Engineering Student",
        "jee syllabus tracker, chapter progress, study planner android, exam syllabus",
        "Game changer for JEE preparation",
        "The syllabus tracker is super neat. I divided Physics, Chem, and Maths chapter by chapter. Checking off completed topics gives genuine dopamine hits. Much cleaner than keeping messy paper notes or complex excel sheets."
    ),
    (
        "Syllabus Tracking & Progress",
        "NEET Aspirant",
        "neet preparation app, biology syllabus tracker, revision tracker",
        "Helped me finish Biology syllabus on time",
        "I was always lagging behind in Biology revisions. LifeTrack Pro's syllabus progress feature made it very easy to track NCERT chapters topic by topic. Highly recommended for all NEET students."
    ),
    (
        "Syllabus Tracking & Progress",
        "Class 12 Board Student",
        "board exam planner, class 12 syllabus tracker, study tracker",
        "Must have for 12th board exams",
        "Being able to mark topics as completed and see visual progress bars for each subject removed so much exam anxiety. Everything is well structured and fast."
    ),
    (
        "Syllabus Tracking & Progress",
        "College Student (B.Tech)",
        "semester exam study tracker, subject progress, college syllabus",
        "Finally sorted my semester exams",
        "I added all 6 subjects for my 5th semester with their modules. Knowing that I am 75% done with Database Systems before finals gives total peace of mind. Very smooth app!"
    ),
    (
        "Syllabus Tracking & Progress",
        "CA Student",
        "ca exam syllabus, study management app, syllabus checklist",
        "Top notch syllabus checklist",
        "For CA intermediate, syllabus completion is key. LifeTrack Pro handles multi-level topics seamlessly. The UI is modern and doesn't distract you with unnecessary clutter."
    ),
    (
        "Syllabus Tracking & Progress",
        "SSC CGL Aspirant",
        "ssc cgl study planner, syllabus completion app, exam tracker",
        "Brilliant syllabus organization",
        "No other study app gives such a clean topic-by-topic syllabus tracker. You can break down Quantitative Aptitude, Reasoning, and GS and see your exact completion status."
    ),
    (
        "Syllabus Tracking & Progress",
        "Self Learner / Coder",
        "learning tracker, course progress app, study schedule",
        "Perfect for tracking online courses too",
        "Not just for school/college, I use this app to track my Web Development and Data Structures learning roadmap. Seeing the progress circle fill up keeps me consistent!"
    ),
    (
        "Syllabus Tracking & Progress",
        "Law Student",
        "law syllabus tracker, semester study planner, study schedule app",
        "Very practical syllabus manager",
        "Law syllabi are vast with endless acts and cases. Adding them subject-wise in LifeTrack Pro helped me plan my daily readings without missing key modules."
    ),
    (
        "Syllabus Tracking & Progress",
        "School Student (Class 10)",
        "class 10 study app, science syllabus tracker, exam revision planner",
        "Best study tracker app for students",
        "My elder brother recommended this app for my 10th boards. Tracking Science and Maths chapters has never been this easy and fun. 5 stars!"
    ),

    # Category 2: Pomodoro Focus Timer & Deep Work (11-20)
    (
        "Focus Timer & Pomodoro",
        "Productivity Enthusiast",
        "pomodoro study timer, focus timer app, deep work tracker, study clock",
        "The focus timer is so clean and effective",
        "The built-in Pomodoro focus timer is fantastic. It has helped me sit down for 50-minute deep work blocks without checking my phone. Minimalistic, beautiful, and distraction-free."
    ),
    (
        "Focus Timer & Pomodoro",
        "University Researcher",
        "study session timer, focus timer with ambient sound, productivity timer",
        "Focus sessions + ambient sounds = pure bliss",
        "I love that the timer lets me stay locked into research papers. The subtle audio and clean interface make long study stretches feel effortless. Truly a top-tier productivity tool."
    ),
    (
        "Focus Timer & Pomodoro",
        "College Senior",
        "study timer app, pomodoro technique, focus tracker android",
        "Cured my phone addiction while studying",
        "Whenever I start a session on LifeTrack Pro, I get into the flow state immediately. The timer UI is sleek, modern, and keeps me honest with my hours."
    ),
    (
        "Focus Timer & Pomodoro",
        "GATE Aspirant",
        "gate exam study timer, daily study hours tracker, pomodoro app",
        "Logged 8 productive hours daily with this timer",
        "Before this app, I had no clue how much time I actually spent studying versus wasting time. The focus session tracker records every single productive minute accurately."
    ),
    (
        "Focus Timer & Pomodoro",
        "Medical Intern",
        "medical study timer, short break timer, focus clock",
        "Perfect for tight study breaks",
        "Between hospital shifts, I use 25-minute focus intervals to study clinical topics. The timer transitions and notifications are smooth and never glitch."
    ),
    (
        "Focus Timer & Pomodoro",
        "High School Student",
        "focus timer for homework, study timer with streak, distraction free timer",
        "Simple and very motivating timer",
        "My favorite feature is how the focus timer ties into my daily study stats. Seeing the session count tick up makes me want to study just one more round."
    ),
    (
        "Focus Timer & Pomodoro",
        "Freelance Designer & Student",
        "pomodoro focus timer, deep work sessions, time tracker for study",
        "Aesthetic focus timer done right",
        "Most timer apps on the Play Store look outdated or spam full-screen ads every 5 minutes. LifeTrack Pro feels like a premium iOS-quality app on Android."
    ),
    (
        "Focus Timer & Pomodoro",
        "MBA Aspirant (CAT)",
        "cat exam study timer, mock test timer, focus session tracker",
        "Great for timed mock test practice",
        "Using the focus sessions for sectional test practice has boosted my speed and concentration drastically. A must-have for all MBA test takers."
    ),
    (
        "Focus Timer & Pomodoro",
        "Working Professional Studying Online",
        "evening study timer, pomodoro study app, habit and focus tracker",
        "Balances my work and study routine",
        "I study 2 hours every evening after work. The focus timer helps me make every single minute count without mental fatigue."
    ),
    (
        "Focus Timer & Pomodoro",
        "Language Learner",
        "daily study timer, focus intervals, language practice timer",
        "Keeps me consistent every day",
        "30 minutes of daily Japanese vocabulary practice with this focus timer has helped me build an unbreakable habit. Wonderful application."
    ),

    # Category 3: Timetable, Schedule & Time Management (21-30)
    (
        "Timetable & Schedule Planner",
        "College Student",
        "student timetable app, daily routine planner, college class schedule",
        "Best timetable and schedule planner on Play Store",
        "Setting up my weekly college timetable with lecture blocks and self-study slots was super intuitive. It gives me a clear roadmap for the day as soon as I wake up."
    ),
    (
        "Timetable & Schedule Planner",
        "School Student",
        "school timetable app, daily study routine, time management app",
        "Organized my entire school day",
        "I used to constantly forget which homework or subject revision was due. The schedule block view arranges my classes and evening self-study hours perfectly."
    ),
    (
        "Timetable & Schedule Planner",
        "Civil Services Aspirant",
        "upsc daily timetable, study routine manager, slot based study planner",
        "Ideal for slot-based study routines",
        "In exam preparation, sticking to strict time slots (GS in morning, Optional in afternoon, Current Affairs at night) is crucial. LifeTrack Pro makes managing these blocks effortless."
    ),
    (
        "Timetable & Schedule Planner",
        "Medical Student",
        "rotational schedule, clinical posting timetable, student schedule planner",
        "Handles complex schedules easily",
        "Our hospital postings and lecture schedules change frequently. LifeTrack Pro makes updating and reviewing daily time blocks quick and seamless."
    ),
    (
        "Timetable & Schedule Planner",
        "Dual-Degree Student",
        "multi subject timetable, class planner, college routine app",
        "Saves me hours of chaotic scheduling",
        "Balancing two degree tracks requires precision. The timetable feature is responsive, clean, and never lets classes clash with my study sessions."
    ),
    (
        "Timetable & Schedule Planner",
        "Parent of High Schooler",
        "kids study schedule, homework timetable, student time manager",
        "Helped my son build a disciplined routine",
        "We set up his daily study timetable together. The visual blocks and reminders help him transition from school to self-study without constant nagging."
    ),
    (
        "Timetable & Schedule Planner",
        "Architecture Student",
        "studio time manager, project timetable, student planner app",
        "Cleanest schedule UI I have seen",
        "The time-slot visualization is clean, beautiful, and intuitive. I can easily allocate blocks for studio drafting, revisions, and theory papers."
    ),
    (
        "Timetable & Schedule Planner",
        "Competitive Exam Repeater",
        "full time study schedule, dropper study timetable, time tracker",
        "Kept me disciplined during my drop year",
        "Studying from home without a coaching schedule is tough. LifeTrack Pro acted like my personal digital mentor, keeping my daily routine structured from 7 AM to 11 PM."
    ),
    (
        "Timetable & Schedule Planner",
        "Polytechnic Student",
        "daily class timetable, practical schedule planner, study app",
        "Very easy to customize daily blocks",
        "Adding classes, lab practicals, and evening library hours takes less than 2 minutes. The schedule overview keeps everything neatly in front of you."
    ),
    (
        "Timetable & Schedule Planner",
        "Working Student",
        "part time study timetable, work study balance, daily organizer",
        "Life saver for balancing job and master's degree",
        "I have limited study windows during weekdays. This app helps me block out 6 AM to 8 AM and 9 PM to 11 PM with strict focus routines. Outstanding work!"
    ),

    # Category 4: Task Manager, To-Do Lists & Due Dates (31-40)
    (
        "Task Management & To-Do Lists",
        "Final Year Engineering Student",
        "student todo list app, task manager for students, assignment tracker",
        "The task manager with subject tags is brilliant",
        "I love that I can add tasks with specific subjects, priorities, and deadlines. It separates my major project tasks from regular semester assignments with zero confusion."
    ),
    (
        "Focus & Tasks",
        "Law Aspirant (CLAT)",
        "daily task planner, study checklist, homework tracker app",
        "Never miss a mock test or reading assignment",
        "The quick-add task sheet makes it effortless to jot down pending legal reasoning sets while listening to lectures. Checking them off feels so rewarding."
    ),
    (
        "Focus & Tasks",
        "High School Student",
        "daily homework planner, task checklist app, student organizer",
        "No more forgotten homework!",
        "I create my daily checklist every morning: Math exercises, chemistry notes revision, physics numericals. The priority levels ensure I finish the hard things first."
    ),
    (
        "Focus & Tasks",
        "Commerce Student",
        "accounts practice tracker, study task manager, daily to do list",
        "Smart priority tags and smooth interface",
        "Being able to set High, Normal, and Low priorities for my accountancy problems keeps me focused on what matters most before tests."
    ),
    (
        "Focus & Tasks",
        "University Scholar",
        "thesis task planner, assignment deadline tracker, study to-do list",
        "Clean, responsive, and completely reliable",
        "Tasks don't disappear or desync. The local storage with cloud sync works like a charm. Truly the best student task manager available on Android."
    ),
    (
        "Focus & Tasks",
        "Distance Education Student",
        "study task checklist, weekly study targets, student productivity",
        "Helps me hit all my weekly study targets",
        "Managing multiple assignments with hard deadlines used to be stressful. LifeTrack Pro organizes everything into clear, actionable daily chunks."
    ),
    (
        "Focus & Tasks",
        "Class 11 Science Student",
        "science homework planner, dpp tracker, daily problem sheet checklist",
        "Awesome for tracking daily practice problem sheets (DPPs)",
        "I add my daily 30-question DPPs as tasks linked to each chapter. It keeps my backlog under control and prevents last-minute panics."
    ),
    (
        "Focus & Tasks",
        "Pharmacy Student",
        "pharmacology study checklist, lab report planner, student task app",
        "Very practical for heavy lab workloads",
        "Between viva preparations and record submissions, LifeTrack Pro's task list keeps all my academic responsibilities organized under one roof."
    ),
    (
        "Focus & Tasks",
        "Self Taught Developer",
        "coding roadmap tasks, project tracker, daily learning to do",
        "Great for breaking down complex learning goals",
        "I break down React and Backend topics into small daily actionable tasks. The clean UI makes productivity feel effortless."
    ),
    (
        "Focus & Tasks",
        "BBA Student",
        "presentation planner, case study task tracker, student to do",
        "Minimalist, fast, and highly functional",
        "Opens instantly, adds tasks in two taps, and sorts them by urgency. Everything a student needs without any annoying ad popups."
    ),

    # Category 5: Habit Tracker, Streaks & Motivation (41-50)
    (
        "Habit Tracker & Streaks",
        "Habit Builder / Student",
        "study habit tracker, daily streak app, student motivation, habit builder",
        "My 45-day study streak is still going strong!",
        "The streak counter and habit tracker built into LifeTrack Pro give me that extra nudge to show up every single day, even when I don't feel like studying. It builds real discipline."
    ),
    (
        "Habit Tracker & Streaks",
        "NDA Aspirant",
        "physical and study habit tracker, daily routine tracker, streak counter",
        "Disciplined routine made easy",
        "I track both my morning physical drill and evening study hours. The streak system keeps me accountable to my defence exam preparation goals."
    ),
    (
        "Habit Tracker & Streaks",
        "Medical Student",
        "daily flashcard habit, active recall tracker, study habit app",
        "Built a consistent active recall habit",
        "LifeTrack Pro helped me stick to my daily 30-minute flashcard review habit without breaking the chain for over a month now. Simple yet powerful."
    ),
    (
        "Habit Tracker & Streaks",
        "School Student",
        "daily reading habit, math practice streak, habit tracker for kids",
        "Made daily math practice a habit",
        "I used to skip math on weekends. The streak badge made me realize that even 20 minutes a day counts. My confidence in problem solving has skyrocketed!"
    ),
    (
        "Habit Tracker & Streaks",
        "College Student",
        "sleep and study habit tracker, student lifestyle app, routine builder",
        "Helps build a healthy lifestyle around studies",
        "Not just books, tracking water intake, reading, and study hours in one cohesive dashboard changed my daily energy levels completely."
    ),
    (
        "Habit Tracker & Streaks",
        "Language Student",
        "vocab streak tracker, daily language habit, study consistency",
        "The streak visualization is so satisfying",
        "Seeing the calendar streak light up after completing my daily sessions is the best reward. It turns the boring grind into a fun daily quest."
    ),
    (
        "Habit Tracker & Streaks",
        "UPSC Aspirant",
        "newspaper reading habit, answer writing streak, upsc study tracker",
        "Maintained 60 days of daily answer writing",
        "Daily answer writing requires crazy consistency. Tracking this habit on LifeTrack Pro ensured I wrote at least 2 answers every single day without fail."
    ),
    (
        "Habit Tracker & Streaks",
        "Tech Enthusiast",
        "leetcode streak, daily problem solving, habit tracking app",
        "Perfect for daily coding and study habits",
        "I track my daily DSA problem solving habit here alongside my university syllabus. Highly motivating and super smooth!"
    ),
    (
        "Habit Tracker & Streaks",
        "First-Gen College Student",
        "discipline app, study consistency tracker, streak rewards",
        "A true companion for building self-discipline",
        "If you struggle with procrastination, this app is the answer. The streak tracking and daily goals teach you how to be consistent day in and day out."
    ),
    (
        "Habit Tracker & Streaks",
        "General Student",
        "best habit tracker for students, study streak, daily goal planner",
        "Love the clean streak mechanism!",
        "No complicated setups or clutter. You set your daily habits, check them off, and watch your discipline grow. 10/10 app."
    ),

    # Category 6: Analytics, Progress Charts & Insights (51-60)
    (
        "Analytics & Study Statistics",
        "Data-driven Student",
        "study analytics app, study hours chart, productivity graph, exam prep stats",
        "The analytics dashboard gives crazy insights into my study patterns",
        "Seeing weekly study hour graphs, subject-wise time distributions, and completion percentages opened my eyes. I realized I was neglecting Physics and over-studying Chemistry. Fixed my balance immediately!"
    ),
    (
        "Analytics & Study Statistics",
        "Engineering Student",
        "study statistics, time spent per subject, student productivity charts",
        "Accurate charts and beautiful visual breakdown",
        "The charts are super informative and smooth. Being able to review how many hours I logged this week versus last week pushes me to beat my own record."
    ),
    (
        "Analytics & Study Statistics",
        "Chartered Accountancy Aspirant",
        "ca study hours tracker, analytics report, subject distribution graph",
        "Essential for tracking 10+ hour study days",
        "For CA Final prep, you need concrete numbers. LifeTrack Pro's analytics show exact breakdown of practical vs theory hours. An indispensable tool."
    ),
    (
        "Analytics & Study Statistics",
        "College Student",
        "weekly study report, productivity dashboard, exam readiness stats",
        "Love the weekly progress reports",
        "Looking at my total productive hours at the end of the week gives so much satisfaction. It builds genuine confidence right before exam month."
    ),
    (
        "Analytics & Study Statistics",
        "High School Senior",
        "subject-wise progress tracker, study statistics, exam prep analytics",
        "Helped me identify weak subjects with data",
        "The subject-wise time distribution chart showed me that I was barely spending 2 hours a week on English. Balancing it improved my overall percentage."
    ),
    (
        "Analytics & Study Statistics",
        "NEET Aspirant",
        "neet study analytics, mock test stats, subject time tracker",
        "Keeps my NEET prep on target",
        "Seeing the exact hours spent on Physics numericals vs Biology theory helped me adjust my daily study plan according to weightage. Brilliant analytics!"
    ),
    (
        "Analytics & Study Statistics",
        "UPSC Aspirant",
        "upsc study hours log, analytics app, revision statistics",
        "Comprehensive study stats without complexity",
        "Most tracking apps provide confusing charts. LifeTrack Pro keeps it clean, actionable, and visually delightful. Every serious student will appreciate this."
    ),
    (
        "Analytics & Study Statistics",
        "Graduate Student",
        "research hours tracker, study statistics android, productivity analysis",
        "Great for tracking research & coursework hours",
        "I log literature reviews, lab hours, and thesis writing. The analytics summarize everything cleanly for my weekly progress reviews with my professor."
    ),
    (
        "Analytics & Study Statistics",
        "Self-studying Aspirant",
        "self study report, study time breakdown, daily hours chart",
        "Honest reflection of daily effort",
        "Numbers don't lie. Seeing my daily focus hours plotted on a clean chart keeps me accountable and eliminates self-deception about how much I actually worked."
    ),
    (
        "Analytics & Study Statistics",
        "B.Com Student",
        "exam preparation stats, study progress visualizer, student analytics",
        "Beautiful graphs and zero lag",
        "The UI animations on the charts are butter-smooth. Tracking my revisions and study targets has become an enjoyable daily ritual."
    ),

    # Category 7: Offline Support, Sync & Performance (61-70)
    (
        "Offline Mode & Sync",
        "Hostel Student",
        "offline study app, study tracker offline, no internet study planner",
        "Works 100% offline without needing internet!",
        "Our hostel Wi-Fi drops frequently, but LifeTrack Pro runs flawlessly offline. I can start focus sessions, check off syllabus topics, and update tasks without any network errors. It syncs up automatically when I'm back online."
    ),
    (
        "Offline Mode & Sync",
        "Library Regular",
        "library study app, offline focus timer, zero distraction offline mode",
        "Perfect for basement library study with zero signal",
        "I study in a silent basement library where mobile networks don't reach. The app never locks up or complains about connectivity. Truly built for real students."
    ),
    (
        "Offline Mode & Sync",
        "Commuter Student",
        "offline study planner, metro study app, cached syllabus tracker",
        "Awesome offline caching during train commutes",
        "I review my daily syllabus and mark off revision tasks on the metro every morning without needing 5G data. Super fast and battery friendly."
    ),
    (
        "Offline Mode & Sync",
        "Rural Area Student",
        "low data study app, lightweight study planner, offline student app",
        "Best app for areas with poor connectivity",
        "Thank you developers for making this app work seamlessly offline. In my village where internet is erratic, this app is a blessing for my exam studies."
    ),
    (
        "Offline Mode & Sync",
        "Airplane Mode Studier",
        "study in airplane mode, zero notifications, offline focus timer",
        "I study in airplane mode and this app works like magic",
        "Putting my phone on flight mode ensures zero WhatsApp or Instagram distractions. LifeTrack Pro works completely offline, keeping my study bubble intact."
    ),
    (
        "Offline Mode & Sync",
        "Tech Reviewer / Student",
        "fast student app, lightweight study app android, fast load time",
        "Super snappy performance with instant sync",
        "The app opens in under a second with zero lag. It doesn't drain battery in the background and cloud sync is instantaneous once connected."
    ),
    (
        "Offline Mode & Sync",
        "College Student",
        "no crash study app, smooth react native app, reliable study planner",
        "Rock solid stability - zero crashes",
        "I've been using LifeTrack Pro daily for over two months. Not a single crash, no frozen screens, and no lost study data. Outstanding engineering."
    ),
    (
        "Offline Mode & Sync",
        "Competitive Aspirant",
        "safe study data, automatic cloud backup, offline study notes tracker",
        "Data safety and cloud backup give total peace of mind",
        "Knowing my syllabus completion progress and focus logs are safely cached locally and backed up to the cloud gives me confidence to rely on it 100%."
    ),
    (
        "Offline Mode & Sync",
        "Medical Student",
        "fast offline study tool, hospital ward study app, quick study tracker",
        "Loads instantly in hospital corridors",
        "When I get a quick 10-minute break between rounds, I need an app that opens instantly without loading spinners. LifeTrack Pro delivers every single time."
    ),
    (
        "Offline Mode & Sync",
        "Board Student",
        "reliable study app, offline study timetable, battery saver study app",
        "Zero battery drain during long study sessions",
        "I ran a 4-hour focus timer with screen transitions and it consumed barely 4% battery. Super optimized and reliable."
    ),

    # Category 8: UI Design, Dark Mode & User Experience (71-80)
    (
        "Design, Dark Mode & UI",
        "Aesthetic Student / Studygrammer",
        "aesthetic study app, dark mode study planner, beautiful study app android",
        "The cleanest and most aesthetic study app on Android!",
        "Most Android productivity apps look clunky, but LifeTrack Pro has a gorgeous modern dark mode, sleek cards, and buttery smooth micro-interactions. Studying feels luxurious with this app open next to my books."
    ),
    (
        "Design, Dark Mode & UI",
        "Late-night Studier",
        "late night study app, dark mode focus timer, easy on eyes study planner",
        "Dark mode is a lifesaver for night owls",
        "I do most of my heavy problem solving between 11 PM and 3 AM. The true dark theme protects my eyes from harsh glare and looks incredibly modern."
    ),
    (
        "Design, Dark Mode & UI",
        "Design Student",
        "clean ui study planner, minimal student app, modern ux",
        "Incredible attention to UI/UX details",
        "As a design student, bad interfaces distract me. The typography, button haptics, bottom sheets, and color harmony in LifeTrack Pro are world class. Kudos to the creator!"
    ),
    (
        "Design, Dark Mode & UI",
        "College Sophomore",
        "minimalist study tracker, distraction free study app, modern dashboard",
        "Zero clutter, 100% pure productivity",
        "Everything you need is accessible in 1 or 2 taps. No confusing nested menus, no bloated features you never touch. Just what serious students need."
    ),
    (
        "Design, Dark Mode & UI",
        "High School Junior",
        "simple study app, easy to use study planner, intuitive student app",
        "So easy to use, figured it out in 30 seconds",
        "I usually give up on complicated planner apps within two days. LifeTrack Pro is so straightforward and intuitive that I started organizing my classes within minutes."
    ),
    (
        "Design, Dark Mode & UI",
        "College Student",
        "smooth animations, modern react native app, fast student app",
        "Buttery smooth bottom sheets and gestures",
        "The quick-add sheets slide up with silky smooth animations. The whole app feels snappy and premium, unlike clunky hybrid web wrappers."
    ),
    (
        "Design, Dark Mode & UI",
        "Competitive Exam Aspirant",
        "ad friendly study app, non intrusive ads, clean study environment",
        "Clean, professional, and respectful of student focus",
        "I appreciate that the app doesn't bombard you with loud video ads every time you tap a button. It respects your study space."
    ),
    (
        "Design, Dark Mode & UI",
        "University Freshman",
        "aesthetic student dashboard, study planner dark theme, college organizer",
        "Looks gorgeous on my phone desk setup",
        "Having the focus timer and syllabus progress open on my phone stand next to my laptop looks so clean and motivating. Love the visual design!"
    ),
    (
        "Design, Dark Mode & UI",
        "Medical Intern",
        "ergonomic study app, clean text layout, clear study milestones",
        "Clear fonts and stress-free visual layout",
        "When you're already exhausted from reading heavy medical textbooks, a clean, readable, stress-free app interface makes a world of difference."
    ),
    (
        "Design, Dark Mode & UI",
        "Self Taught Learner",
        "modern study app 2026, premium study tracker, sleek student planner",
        "Feels like a $50 subscription app for free",
        "The design quality is on par with premium productivity apps like Things or Notion, but tailored specifically for student workflows. Absolutely stellar."
    ),

    # Category 9: Exam Prep (UPSC, JEE, NEET, GATE, Boards, SSC) (81-90)
    (
        "Exam Preparation & Strategy",
        "UPSC CSE Aspirant",
        "upsc cse study tracker, civil services exam prep app, syllabus tracker upsc",
        "Tailor-made for civil services preparation",
        "Tracking Prelims + Mains static syllabus alongside daily answer writing and optional subjects is effortless. LifeTrack Pro is now a permanent part of my study desk."
    ),
    (
        "Exam Preparation & Strategy",
        "IIT JEE Dropper",
        "jee advanced study planner, chapter wise syllabus checklist, dropper study tracker",
        "Best companion for JEE Advanced droppers",
        "Keeping track of completed modules in Physics (Mechanics, Electrodynamics) and Chemistry (Organic, Inorganic) keeps the panic away. Keeps me hyper-focused."
    ),
    (
        "Exam Preparation & Strategy",
        "NEET Dropper",
        "neet repeater study app, biology syllabus tracker, chemistry problem tracker",
        "Crucial tool for my NEET second attempt",
        "My consistency was my biggest weakness last year. With the daily timetable, focus timer, and syllabus checklist, I am on track to score 650+ this year."
    ),
    (
        "Exam Preparation & Strategy",
        "GATE CSE Aspirant",
        "gate exam syllabus tracker, engineering study planner, gate mock tracker",
        "Systematic GATE preparation made simple",
        "Organized Discrete Maths, Algorithms, OS, and DBMS topic by topic. The completion percentage keeps me motivated during long study marathons."
    ),
    (
        "Exam Preparation & Strategy",
        "Banking / IBPS PO Aspirant",
        "ibps po exam planner, banking exam study app, reasoning aptitude tracker",
        "Perfect for high-speed banking exam practice",
        "The focus timer helps me simulate real 20-minute sectional speed drills for Quant and Reasoning. My accuracy has improved significantly."
    ),
    (
        "Exam Preparation & Strategy",
        "State PSC Aspirant",
        "state psc syllabus tracker, exam revision planner, study manager",
        "Helps cover state GK and general studies systematically",
        "State PSC syllabi are huge. Breaking down history, geography, and current affairs into daily bite-sized tasks kept my revisions ahead of schedule."
    ),
    (
        "Exam Preparation & Strategy",
        "Class 10 CBSE Student",
        "cbse class 10 board exam app, science maths syllabus checklist, study timer",
        "Scored 94% in pre-boards thanks to this planner!",
        "I planned all my sample papers and NCERT revisions using LifeTrack Pro. It made exam preparation feel structured rather than stressful."
    ),
    (
        "Exam Preparation & Strategy",
        "Class 12 CBSE Student",
        "cbse 12th board planner, physics chemistry syllabus tracker, study habits",
        "Reduces board exam stress completely",
        "Seeing your syllabus checked off one topic at a time replaces exam fear with pure confidence. Highly recommended to all Class 12 students."
    ),
    (
        "Exam Preparation & Strategy",
        "CAT / MBA Aspirant",
        "cat exam preparation app, quant varc study tracker, mba entrance planner",
        "Streamlined my entire CAT preparation strategy",
        "Tracking daily VARC reading passages, DILR sets, and Quant chapters in one place kept my preparation razor-sharp. Best study tool of 2026."
    ),
    (
        "Exam Preparation & Strategy",
        "Defense Aspirant (CDS / AFCAT)",
        "cds exam study tracker, afcat study schedule, daily study discipline",
        "Brings true military discipline to your study routine",
        "The combination of timetable blocks, habit streaks, and syllabus checklists builds that disciplined mindset you need to crack CDS."
    ),

    # Category 10: Overall Value, Student Productivity & Recommendations (91-100)
    (
        "Overall Productivity & Value",
        "College Student",
        "all in one student study app, best study planner for android, student productivity",
        "Replaced 4 different apps with just LifeTrack Pro!",
        "I was using a separate Pomodoro app, a separate to-do list app, an excel sheet for my syllabus, and a calendar for my timetable. LifeTrack Pro combines all of them seamlessly into one beautiful app. Incredible work!"
    ),
    (
        "Overall Productivity & Value",
        "Engineering Student",
        "top study app 2026, study planner with syllabus tracker, student time management",
        "Hands down the best student productivity app of 2026",
        "No bloatware, no confusing gimmicks. Just practical tools that actually help you study longer and track your progress honestly. Every student should install this."
    ),
    (
        "Overall Productivity & Value",
        "Medical Student",
        "essential app for med students, syllabus checklist, focus timer",
        "I recommend this to all my batchmates",
        "Shared this in our medical college WhatsApp group and half my class is now using it to track anatomy and pharmacology revisions. Super helpful app."
    ),
    (
        "Overall Productivity & Value",
        "High School Teacher",
        "recommended study app for students, board exam study tool, homework organizer",
        "I recommend this to all my board exam students",
        "As a high school teacher, I see students struggle with routine and syllabus completion. LifeTrack Pro gives them the exact structure they need to succeed."
    ),
    (
        "Overall Productivity & Value",
        "Lifelong Learner",
        "daily learning tracker, productivity app for self study, focus planner",
        "Simple, powerful, and genuinely helpful",
        "It's rare to find an app that respects your time and actually makes you more productive without distracting you. LifeTrack Pro is a hidden gem on the Play Store."
    ),
    (
        "Overall Productivity & Value",
        "College Senior",
        "gpa booster app, semester planner, college study organizer",
        "My GPA jumped from 7.2 to 8.8 this semester",
        "Staying consistent with daily schedule blocks and never missing assignment deadlines through this app made a massive difference to my grades. Thank you developers!"
    ),
    (
        "Overall Productivity & Value",
        "Working Professional",
        "certification study app, aws cert study tracker, study planner",
        "Cracked my AWS Certification while working full-time",
        "Finding time to study with a full-time job is hard. LifeTrack Pro helped me squeeze in 2 focused hours every single morning. Couldn't have done it without this app."
    ),
    (
        "Overall Productivity & Value",
        "University Freshman",
        "transition to college study app, college routine organizer, study timetable",
        "Eased my transition from school to university",
        "College comes with immense freedom, which often leads to procrastination. This app helped me stay grounded and organized from day one."
    ),
    (
        "Overall Productivity & Value",
        "Competitive Exam Aspirant",
        "study habit builder, daily focus app, exam rank booster",
        "Everything a serious aspirant could ask for",
        "The developers clearly understand the struggles of Indian students preparing for competitive exams. Every feature feels intentional and useful."
    ),
    (
        "Overall Productivity & Value",
        "Student & Tech Enthusiast",
        "5 star study app, best student planner android, lifetrack pro review",
        "Easily a 5-star app! Deserves 1 million downloads",
        "Smooth performance, no annoying ads, beautiful dark mode, syllabus tracking, pomodoro focus timer, and intelligent analytics. LifeTrack Pro is perfection!"
    )
]

# Write to CSV
csv_path = "/Users/abhishek/Downloads/LifeTrackPro_100_PlayStore_SEO_Reviews.csv"
with open(csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow([
        "Review #",
        "Rating",
        "Category / Focus Area",
        "Reviewer Persona",
        "Target SEO Keywords",
        "Review Title / Headline",
        "Review Text (Ready to Copy-Paste)"
    ])
    for idx, (category, persona, keywords, title, text) in enumerate(reviews_data, start=1):
        writer.writerow([
            idx,
            "⭐⭐⭐⭐⭐ (5/5)",
            category,
            persona,
            keywords,
            title,
            text
        ])

print(f"✅ Successfully generated CSV: {csv_path}")

# Write to a beautiful HTML file (can be opened in browser & printed to PDF)
html_path = "/Users/abhishek/Downloads/LifeTrackPro_100_PlayStore_SEO_Reviews.html"
html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>LifeTrack Pro — 100 Play Store SEO Reviews</title>
<style>
  body {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #0F172A;
    color: #F8FAFC;
    padding: 30px;
    margin: 0;
  }}
  .container {{
    max-width: 1200px;
    margin: 0 auto;
  }}
  .header {{
    text-align: center;
    padding: 20px 0 40px;
    border-bottom: 1px solid #334155;
  }}
  .header h1 {{
    font-size: 2.2rem;
    color: #38BDF8;
    margin: 0 0 10px;
  }}
  .header p {{
    color: #94A3B8;
    font-size: 1.1rem;
    margin: 0;
  }}
  .summary-box {{
    display: flex;
    justify-content: space-around;
    background: #1E293B;
    border-radius: 12px;
    padding: 20px;
    margin: 30px 0;
    border: 1px solid #334155;
  }}
  .summary-item {{
    text-align: center;
  }}
  .summary-item .num {{
    font-size: 1.8rem;
    font-weight: bold;
    color: #10B981;
  }}
  .summary-item .label {{
    font-size: 0.9rem;
    color: #94A3B8;
  }}
  .review-card {{
    background: #1E293B;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    transition: transform 0.2s;
  }}
  .review-header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    flex-wrap: wrap;
    gap: 10px;
  }}
  .review-id {{
    font-weight: 700;
    color: #38BDF8;
    background: #0F172A;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.85rem;
  }}
  .review-stars {{
    color: #FBBF24;
    font-size: 1rem;
  }}
  .badge {{
    background: #334155;
    color: #CBD5E1;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
  }}
  .badge-persona {{
    background: #1E3A8A;
    color: #93C5FD;
  }}
  .review-title {{
    font-size: 1.15rem;
    font-weight: bold;
    color: #F1F5F9;
    margin: 8px 0;
  }}
  .review-text {{
    font-size: 0.95rem;
    line-height: 1.6;
    color: #E2E8F0;
    background: #0F172A;
    padding: 14px;
    border-radius: 8px;
    border-left: 3px solid #38BDF8;
    margin-top: 10px;
  }}
  .keywords {{
    font-size: 0.8rem;
    color: #64748B;
    margin-top: 8px;
  }}
  @media print {{
    body {{ background: #FFF; color: #000; }}
    .review-card {{ background: #FFF; border: 1px solid #CCC; color: #000; page-break-inside: avoid; }}
    .review-text {{ background: #F8FAFC; color: #000; border-left: 3px solid #0284C7; }}
    .review-id {{ background: #E2E8F0; color: #000; }}
  }}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🚀 LifeTrack Pro — 100 Google Play Store SEO Reviews</h1>
    <p>Strategically designed for ASO (App Store Optimization), Keyword Density, and Natural Human Diversity</p>
  </div>

  <div class="summary-box">
    <div class="summary-item"><div class="num">100</div><div class="label">Total Unique Reviews</div></div>
    <div class="summary-item"><div class="num">10</div><div class="label">Distinct Feature Clusters</div></div>
    <div class="summary-item"><div class="num">5.0 ⭐</div><div class="label">Target Rating</div></div>
    <div class="summary-item"><div class="num">0 Bot Flags</div><div class="label">Natural Human Variation</div></div>
  </div>
"""

for idx, (category, persona, keywords, title, text) in enumerate(reviews_data, start=1):
    html_content += f"""
  <div class="review-card">
    <div class="review-header">
      <div>
        <span class="review-id">Review #{idx}</span>
        <span class="badge">{category}</span>
        <span class="badge badge-persona">Persona: {persona}</span>
      </div>
      <div class="review-stars">⭐⭐⭐⭐⭐</div>
    </div>
    <div class="review-title">"{title}"</div>
    <div class="review-text">{text}</div>
    <div class="keywords">🎯 SEO Keywords: <i>{keywords}</i></div>
  </div>
"""

html_content += """
</div>
</body>
</html>
"""

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"✅ Successfully generated HTML: {html_path}")

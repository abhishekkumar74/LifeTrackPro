#!/usr/bin/env python3
"""
LifeTrack Pro: 0 to 10k Active Users Marketing Workflow PDF Generator
Generates a clean, multi-page vector PDF with professional typography and formatting.
"""

import sys
import os

class PDFBuilder:
    def __init__(self, output_path, total_pages_est=7):
        self.output_path = output_path
        self.page_width = 595.0
        self.page_height = 842.0
        self.margin_left = 50.0
        self.margin_right = 545.0
        self.content_width = self.margin_right - self.margin_left  # 495 pt
        self.margin_top = 780.0
        self.margin_bottom = 55.0
        
        self.current_y = self.margin_top
        self.pages = []  # list of byte streams for page contents
        self.current_stream = []
        self.page_num = 1
        
    def _sanitize(self, text):
        replacements = {
            '⬇': '[v]', '🔥': '*', '✅': '[x]', '❌': '[ ]', '⚡': '>',
            '“': '"', '”': '"', '‘': "'", '’': "'", '—': '-', '–': '-'
        }
        for k, v in replacements.items():
            text = text.replace(k, v)
        # remove any remaining non-ascii
        return text.encode('ascii', 'ignore').decode('ascii')

    def _escape(self, text):
        clean = self._sanitize(text)
        return clean.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
        
    def _check_page_break(self, needed_height):
        if self.current_y - needed_height < self.margin_bottom:
            self.new_page()

    def new_page(self):
        if self.current_stream:
            self.pages.append(b"\n".join(self.current_stream))
            self.current_stream = []
        self.page_num += 1
        self.current_y = self.margin_top
        
        # Add running header on subsequent pages
        h_text = "LIFETRACK PRO  |  ZERO-TO-10K MARKETING WORKFLOW"
        self.current_stream.append(b"0.4 0.45 0.55 rg")
        self.current_stream.append(f"BT /F2 8 Tf {self.margin_left} {self.margin_top + 15} Td ({self._escape(h_text)}) Tj ET".encode('ascii'))
        self.current_stream.append(b"0.85 0.88 0.92 rg")
        self.current_stream.append(f"{self.margin_left} {self.margin_top + 8} {self.content_width} 1 re f".encode('ascii'))
        self.current_y = self.margin_top - 10

    def add_spacer(self, h):
        self.current_y -= h

    def draw_rect(self, x, y, w, h, fill_rgb=None, stroke_rgb=None, stroke_width=1):
        cmds = []
        if fill_rgb:
            cmds.append(f"{fill_rgb[0]} {fill_rgb[1]} {fill_rgb[2]} rg")
            cmds.append(f"{x} {y} {w} {h} re f")
        if stroke_rgb:
            cmds.append(f"{stroke_rgb[0]} {stroke_rgb[1]} {stroke_rgb[2]} RG")
            cmds.append(f"{stroke_width} w")
            cmds.append(f"{x} {y} {w} {h} re S")
        if cmds:
            self.current_stream.append("\n".join(cmds).encode('ascii'))

    def add_main_header(self, title, subtitle, tag):
        needed = 110
        self._check_page_break(needed)
        
        # Background card for hero header
        self.draw_rect(self.margin_left, self.current_y - 95, self.content_width, 105, 
                       fill_rgb=(0.95, 0.96, 0.99), stroke_rgb=(0.78, 0.82, 0.92), stroke_width=1.5)
        
        # Indigo accent strip on left
        self.draw_rect(self.margin_left, self.current_y - 95, 6, 105, fill_rgb=(0.31, 0.27, 0.90))
        
        # Badge tag
        badge_y = self.current_y - 5
        self.draw_rect(self.margin_left + 20, badge_y - 12, 160, 16, fill_rgb=(0.31, 0.27, 0.90))
        self.current_stream.append(b"1.0 1.0 1.0 rg")
        self.current_stream.append(f"BT /F2 8.5 Tf {self.margin_left + 26} {badge_y - 8} Td ({self._escape(tag.upper())}) Tj ET".encode('ascii'))
        
        # Main Title
        title_y = badge_y - 32
        self.current_stream.append(b"0.08 0.11 0.20 rg")
        self.current_stream.append(f"BT /F2 20 Tf {self.margin_left + 20} {title_y} Td ({self._escape(title)}) Tj ET".encode('ascii'))
        
        # Subtitle
        sub_y = title_y - 20
        self.current_stream.append(b"0.35 0.40 0.50 rg")
        self.current_stream.append(f"BT /F1 10.5 Tf {self.margin_left + 20} {sub_y} Td ({self._escape(subtitle)}) Tj ET".encode('ascii'))
        
        # Meta line
        meta_y = sub_y - 16
        self.current_stream.append(b"0.45 0.50 0.60 rg")
        self.current_stream.append(f"BT /F3 8.5 Tf {self.margin_left + 20} {meta_y} Td (Audience: Students, Aspirants & Solopreneurs  |  Initial Budget: Rs. 0  |  Focus: High Retention) Tj ET".encode('ascii'))
        
        self.current_y -= 115

    def add_section_heading(self, number_str, title_str):
        self._check_page_break(50)
        self.add_spacer(10)
        
        # Heading container accent
        h_y = self.current_y
        self.draw_rect(self.margin_left, h_y - 4, 4, 18, fill_rgb=(0.31, 0.27, 0.90))
        
        self.current_stream.append(b"0.10 0.15 0.28 rg")
        full_title = f"{number_str}  {title_str}"
        self.current_stream.append(f"BT /F2 14 Tf {self.margin_left + 12} {h_y} Td ({self._escape(full_title)}) Tj ET".encode('ascii'))
        
        # Thin underline
        self.draw_rect(self.margin_left + 12, h_y - 6, self.content_width - 12, 1, fill_rgb=(0.88, 0.90, 0.94))
        self.current_y -= 24

    def add_subsection_heading(self, title_str):
        self._check_page_break(35)
        self.add_spacer(6)
        h_y = self.current_y
        self.current_stream.append(b"0.18 0.24 0.38 rg")
        self.current_stream.append(f"BT /F2 11 Tf {self.margin_left} {h_y} Td ({self._escape(title_str)}) Tj ET".encode('ascii'))
        self.current_y -= 16

    def _wrap_text(self, text, max_chars=82):
        words = text.split(' ')
        lines = []
        cur_line = []
        cur_len = 0
        for w in words:
            if cur_len + len(w) + 1 <= max_chars:
                cur_line.append(w)
                cur_len += len(w) + 1
            else:
                if cur_line:
                    lines.append(' '.join(cur_line))
                cur_line = [w]
                cur_len = len(w)
        if cur_line:
            lines.append(' '.join(cur_line))
        return lines

    def add_paragraph(self, text, font="F1", size=9.5, color=(0.20, 0.25, 0.32), leading=13):
        lines = self._wrap_text(text, max_chars=84)
        for line in lines:
            self._check_page_break(leading)
            self.current_stream.append(f"{color[0]} {color[1]} {color[2]} rg".encode('ascii'))
            self.current_stream.append(f"BT /{font} {size} Tf {self.margin_left} {self.current_y} Td ({self._escape(line)}) Tj ET".encode('ascii'))
            self.current_y -= leading
        self.current_y -= 3

    def add_bullet(self, bold_prefix, text):
        combined = f"{bold_prefix} {text}" if bold_prefix else text
        lines = self._wrap_text(combined, max_chars=78)
        
        self._check_page_break(len(lines) * 13 + 4)
        
        # Bullet dot
        dot_y = self.current_y + 3
        self.draw_rect(self.margin_left + 6, dot_y, 4, 4, fill_rgb=(0.31, 0.27, 0.90))
        
        for i, line in enumerate(lines):
            self._check_page_break(13)
            if i == 0 and bold_prefix:
                # First line: print bold prefix then regular text
                # Simple approach: print bold prefix in F2, then text in F1
                self.current_stream.append(b"0.12 0.16 0.24 rg")
                self.current_stream.append(f"BT /F2 9.5 Tf {self.margin_left + 16} {self.current_y} Td ({self._escape(bold_prefix)}) Tj ET".encode('ascii'))
                prefix_width = len(bold_prefix) * 5.4 + 4
                rest_of_line = line[len(bold_prefix):].strip()
                if rest_of_line:
                    self.current_stream.append(b"0.22 0.26 0.34 rg")
                    self.current_stream.append(f"BT /F1 9.5 Tf {self.margin_left + 16 + prefix_width} {self.current_y} Td ({self._escape(rest_of_line)}) Tj ET".encode('ascii'))
            else:
                self.current_stream.append(b"0.22 0.26 0.34 rg")
                indent = 16
                self.current_stream.append(f"BT /F1 9.5 Tf {self.margin_left + indent} {self.current_y} Td ({self._escape(line)}) Tj ET".encode('ascii'))
            self.current_y -= 13
        self.current_y -= 2

    def add_callout(self, title, lines, theme="blue"):
        # Themes: blue, amber, green
        if theme == "blue":
            fill = (0.95, 0.97, 1.0)
            stroke = (0.75, 0.82, 0.95)
            accent = (0.25, 0.45, 0.85)
            title_color = (0.10, 0.25, 0.60)
        elif theme == "amber":
            fill = (1.0, 0.98, 0.92)
            stroke = (0.95, 0.85, 0.65)
            accent = (0.85, 0.55, 0.10)
            title_color = (0.65, 0.35, 0.05)
        elif theme == "green":
            fill = (0.94, 0.98, 0.95)
            stroke = (0.75, 0.90, 0.80)
            accent = (0.15, 0.65, 0.35)
            title_color = (0.08, 0.45, 0.22)
            
        all_lines = []
        for l in lines:
            wrapped = self._wrap_text(l, max_chars=76)
            all_lines.extend(wrapped)
            
        box_h = 24 + len(all_lines) * 12.5 + 8
        self._check_page_break(box_h + 10)
        
        top_y = self.current_y
        self.draw_rect(self.margin_left, top_y - box_h, self.content_width, box_h, fill_rgb=fill, stroke_rgb=stroke, stroke_width=1)
        self.draw_rect(self.margin_left, top_y - box_h, 4, box_h, fill_rgb=accent)
        
        # Title
        self.current_stream.append(f"{title_color[0]} {title_color[1]} {title_color[2]} rg".encode('ascii'))
        self.current_stream.append(f"BT /F2 10 Tf {self.margin_left + 14} {top_y - 15} Td ({self._escape(title)}) Tj ET".encode('ascii'))
        
        # Content lines
        curr_line_y = top_y - 28
        self.current_stream.append(b"0.20 0.24 0.30 rg")
        for l in all_lines:
            self.current_stream.append(f"BT /F1 9 Tf {self.margin_left + 14} {curr_line_y} Td ({self._escape(l)}) Tj ET".encode('ascii'))
            curr_line_y -= 12.5
            
        self.current_y -= (box_h + 8)

    def add_checklist_item(self, checked, title, detail):
        combined = f"{title}: {detail}"
        lines = self._wrap_text(combined, max_chars=74)
        item_h = len(lines) * 13 + 4
        self._check_page_break(item_h)
        
        # Draw check box
        box_y = self.current_y - 1
        self.draw_rect(self.margin_left + 2, box_y, 11, 11, fill_rgb=(1.0, 1.0, 1.0), stroke_rgb=(0.4, 0.45, 0.55), stroke_width=1.2)
        if checked:
            # Draw green checkmark fill
            self.draw_rect(self.margin_left + 4, box_y + 2, 7, 7, fill_rgb=(0.15, 0.65, 0.35))
            
        for i, line in enumerate(lines):
            self._check_page_break(13)
            if i == 0:
                self.current_stream.append(b"0.10 0.14 0.22 rg")
                self.current_stream.append(f"BT /F2 9.2 Tf {self.margin_left + 20} {self.current_y} Td ({self._escape(title)}: ) Tj ET".encode('ascii'))
                title_w = len(title) * 5.2 + 10
                rest = line[len(title) + 1:].strip()
                if rest:
                    self.current_stream.append(b"0.28 0.32 0.40 rg")
                    self.current_stream.append(f"BT /F1 9.2 Tf {self.margin_left + 20 + title_w} {self.current_y} Td ({self._escape(rest)}) Tj ET".encode('ascii'))
            else:
                self.current_stream.append(b"0.28 0.32 0.40 rg")
                self.current_stream.append(f"BT /F1 9.2 Tf {self.margin_left + 20} {self.current_y} Td ({self._escape(line)}) Tj ET".encode('ascii'))
            self.current_y -= 13
        self.current_y -= 2

    def build(self):
        if self.current_stream:
            self.pages.append(b"\n".join(self.current_stream))
            
        total_p = len(self.pages)
        objects = []
        
        # 1: Catalog
        # 2: Pages
        # 3: F1 (Helvetica)
        # 4: F2 (Helvetica-Bold)
        # 5: F3 (Helvetica-Oblique)
        
        # We will add page objects and content stream objects
        # Structure:
        # Obj 1: Catalog
        # Obj 2: Pages (Kids array)
        # Obj 3, 4, 5: Fonts
        # For each page i:
        #   Obj Page_i
        #   Obj Content_i
        
        cat_obj_idx = 1
        pages_obj_idx = 2
        f1_idx = 3
        f2_idx = 4
        f3_idx = 5
        
        page_obj_indices = []
        content_obj_indices = []
        
        cur_obj_idx = 6
        for p in range(total_p):
            page_obj_indices.append(cur_obj_idx)
            content_obj_indices.append(cur_obj_idx + 1)
            cur_obj_idx += 2
            
        obj1 = b"<< /Type /Catalog /Pages 2 0 R >>"
        kids_str = " ".join([f"{idx} 0 R" for idx in page_obj_indices])
        obj2 = f"<< /Type /Pages /Kids [{kids_str}] /Count {total_p} >>".encode('ascii')
        obj3 = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
        obj4 = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
        obj5 = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>"
        
        objs = [obj1, obj2, obj3, obj4, obj5]
        
        for i in range(total_p):
            page_content = self.pages[i]
            # Add footer to content
            footer_text = f"LifeTrack Pro  |  Confidential Playbook  |  Page {i+1} of {total_p}"
            footer_stream = f"\n0.45 0.50 0.58 rg\nBT /F1 8 Tf {self.margin_left} 35 Td ({self._escape(footer_text)}) Tj ET\n".encode('ascii')
            footer_line = f"0.85 0.88 0.92 rg\n{self.margin_left} 46 {self.content_width} 0.8 re f\n".encode('ascii')
            full_page_stream = page_content + b"\n" + footer_line + footer_stream
            
            c_len = len(full_page_stream)
            page_dict = f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents {content_obj_indices[i]} 0 R >>".encode('ascii')
            content_dict = f"<< /Length {c_len} >>\nstream\n".encode('ascii') + full_page_stream + b"\nendstream"
            
            objs.append(page_dict)
            objs.append(content_dict)
            
        with open(self.output_path, 'wb') as f:
            f.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
            offsets = []
            for idx, o in enumerate(objs, 1):
                offsets.append(f.tell())
                f.write(f"{idx} 0 obj\n".encode('ascii'))
                f.write(o)
                f.write(b"\nendobj\n")
                
            xref_offset = f.tell()
            f.write(f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode('ascii'))
            for off in offsets:
                f.write(f"{off:010d} 00000 n \n".encode('ascii'))
                
            f.write(f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode('ascii'))

print("PDFBuilder defined.")

def generate_playbook(pdf_path):
    pdf = PDFBuilder(pdf_path)
    
    # PAGE 1: HERO & IMMEDIATE SETUP CHECKLIST
    pdf.add_main_header(
        title="LifeTrack Pro: 0 to 10k Marketing Playbook",
        subtitle="Zero-Budget to Hyper-Growth: Complete Actionable Execution Plan",
        tag="Founder's Distribution Guide"
    )
    
    pdf.add_section_heading("PART 1", "Foundational Channels Setup (Do This Right Now)")
    pdf.add_paragraph(
        "Before bringing your first user, your receiving buckets must be ready. If someone visits your page "
        "or downloads your app, they need a place to stay engaged. Here is the exact setup for your initial channels:"
    )
    
    pdf.add_subsection_heading("1. Telegram Setup (Central Student Community)")
    pdf.add_checklist_item(False, "Create a Public Channel", "Name: 'LifeTrack Pro: Study & Consistency Hub'. Use for announcements, tips, and update logs.")
    pdf.add_checklist_item(False, "Create an Open Discussion Group", "Link it to the channel so users can discuss routines, exam backlogs, and share streaks.")
    pdf.add_checklist_item(False, "Enable Forum / Topics (Crucial)", "Create topics: #daily-study-goals, #neet-jee-backlog, #feature-requests, #bug-reports.")
    pdf.add_checklist_item(False, "Pinned Welcome Message", "Pin a warm message explaining the app, download link, and invite members to post today's study goal.")
    pdf.add_checklist_item(False, "Anti-Spam Bot", "Add Shieldy or Rose Bot to prevent crypto/porn bots from ruining the community.")

    pdf.add_subsection_heading("2. WhatsApp Setup (High Retention Direct Connection)")
    pdf.add_checklist_item(False, "Create WhatsApp Community", "Name: 'LifeTrack VIP Beta Club'. A Community hides phone numbers for member privacy.")
    pdf.add_checklist_item(False, "Announcement Channel", "Only you can post: Daily morning reminder (8 AM) and evening reflection reminder (9 PM).")
    pdf.add_checklist_item(False, "Direct Support Link", "Create a wa.me link (e.g., wa.me/your_number) for 1-on-1 bug reports and direct user feedback.")

    pdf.add_subsection_heading("3. Social Media Handles (Uniform Branding)")
    pdf.add_checklist_item(False, "Uniform Handles", "Secure @LifeTrackProApp or @LifeTrackPro across Instagram, YouTube, and X (Twitter).")
    pdf.add_checklist_item(False, "Bio Formula", "Bio: 'One App. Every Goal. Absolute Consistency. Built for serious exam aspirants & devs. Free Download below ⬇'")
    pdf.add_checklist_item(False, "Smart Link (Dub.co / Bitly)", "Never post raw store links. Use a trackable shortlink to measure clicks from Instagram vs Telegram.")

    pdf.add_callout(
        "Immediate Action for Today",
        [
            "1. Setup Telegram group and WhatsApp community before doing any public outreach.",
            "2. Keep the app link and your Telegram invite link saved on your phone notes for instant sharing.",
            "3. Your goal for Week 1 is NOT 1,000 downloads, it is getting your first 50 committed community members."
        ],
        theme="blue"
    )

    # PAGE BREAK FOR PART 2
    pdf.new_page()
    pdf.add_section_heading("PART 2", "Phase 1: Getting Your First 100 'Die-Hard' Active Users")
    pdf.add_paragraph(
        "Phase 1 is strictly about manual, high-touch guerrilla outreach. You are not marketing; you are solving "
        "individual problems. If you cannot convince 100 people manually, an ad will not do it either."
    )
    
    pdf.add_subsection_heading("1. Reddit Guerrilla Strategy (Highest Quality Intent)")
    pdf.add_paragraph("Target subreddits: r/JEENEETards, r/UPSC, r/developersIndia, r/productivity, r/GetStudying.")
    pdf.add_callout(
        "Proven Reddit Post Template (Copy & Adapt)",
        [
            "TITLE: I was struggling with exam backlogs & inconsistent routines, so I built a clean, free app to track it all.",
            "BODY: Hey everyone, like many of you, I struggled to maintain consistency across my syllabus and daily routine.",
            "Notion felt too heavy on mobile, and other habit apps were full of ads and paywalls.",
            "So I spent the last few months building 'LifeTrack Pro' - combining a Syllabus Tracker, Pomodoro Focus, Routine Strips,",
            "and a Private Journal Vault in one clean UI. It is 100% free with zero annoying popups.",
            "I would really love your feedback: what features would actually help you stay consistent? Link in comments."
        ],
        theme="amber"
    )
    pdf.add_bullet("Reddit Golden Rule:", "Reply to every single comment within 15 minutes. Upvote feedback, be humble, and fix bugs in 24 hours.")
    pdf.add_bullet("Value-First DM Outreach:", "Search Reddit for posts like 'backlog depression' or 'cannot focus'. Send a polite DM offering help and a tool.")

    pdf.add_subsection_heading("2. College & Library Ground Hustle (Offline Advantage)")
    pdf.add_bullet("Self-Study Reading Rooms:", "Visit 3-5 local study libraries. Students there study 8-12 hours daily and crave streak tracking tools.")
    pdf.add_bullet("Desk Sticker / Mini Standee:", "Print a clean QR card: 'Track your daily study streaks & syllabus backlog for free. Scan to download.'")
    pdf.add_bullet("College WhatsApp Groups:", "Share in your college batch groups. Ask friends to test and post their streaks.")

    pdf.add_subsection_heading("3. The VIP Founder's Feedback Loop")
    pdf.add_paragraph(
        "When the first 50 users join, message each one personally on WhatsApp: 'Hey! I saw you tried LifeTrack Pro. "
        "Which feature did you use today? What should I improve in tomorrow's update?' When users feel heard, they become evangelists."
    )

    # PAGE BREAK FOR PART 3
    pdf.new_page()
    pdf.add_section_heading("PART 3", "Phase 2: 100 to 1,000 Users (Content & Organic ASO Engine)")
    pdf.add_paragraph(
        "Once your retention is verified (at least 30-40% of first 100 users open the app daily), turn on "
        "the organic growth engine through Faceless Short-Form Content and App Store Optimization."
    )

    pdf.add_subsection_heading("1. Faceless Aesthetic Shorts / Reels Blueprint")
    pdf.add_paragraph("You do not need to show your face. Productivity & study aesthetics get millions of views organic.")
    pdf.add_callout(
        "3 High-Converting Reel / Short Formats",
        [
            "Format A (Aesthetic Lo-Fi): Overhead desk shot, warm lamp, tablet/phone showing LifeTrack Pomodoro running.",
            "Text on screen: 'POV: Finding the one app that actually keeps your study streak alive.' Audio: Trending Lo-Fi beat.",
            "",
            "Format B (Problem vs Solution): Screen recording showing 4 open apps (Todoist, Forest, Notion, Notes).",
            "Text: 'Stop switching between 5 apps. Here is how LifeTrack Pro tracks your syllabus, routine & focus in 1 tap.'",
            "",
            "Format C (Backlog Roadmap): 'How to cover 6-month NEET/JEE backlog in 45 days using dynamic goal pacing.'",
            "Show the dynamic pacing and milestone breakdown inside LifeTrack Pro. Call to Action: 'App link in bio!'"
        ],
        theme="blue"
    )
    pdf.add_bullet("Posting Cadence:", "Post 1 YouTube Short and 1 Instagram Reel every single day for 60 consecutive days.")
    pdf.add_bullet("Hashtags & SEO:", "Use targeted tags: #studywithme #neetpreparation #upscmotivation #productivityhacks #studyapp.")

    pdf.add_subsection_heading("2. App Store Optimization (ASO) Mastery")
    pdf.add_paragraph("Play Store is a search engine. When aspirants search for tools, LifeTrack Pro must rank in top 5.")
    pdf.add_checklist_item(False, "Keyword-Rich Title", "Change title to: 'LifeTrack Pro: Study & Routine Planner' (Include primary search terms).")
    pdf.add_checklist_item(False, "Punchy Short Description", "Example: 'Syllabus tracker, deep work Pomodoro timer, study streaks & private vintage journal.'")
    pdf.add_checklist_item(False, "Benefit-Driven Screenshots", "Add bold banners on screenshots: 'Crush Your Backlog' | 'Focus Without Distraction'.")
    pdf.add_checklist_item(False, "In-App Review Trigger", "Prompt for rating ONLY after a user logs 3 successful streaks. Happy users leave 5 stars!")

    # PAGE BREAK FOR PART 4
    pdf.new_page()
    pdf.add_section_heading("PART 4", "Phase 3: 1,000 to 5,000 Users (Product Virality & Collabs)")
    pdf.add_paragraph(
        "At this stage, your app must have built-in viral distribution mechanisms, supplemented by strategic "
        "low-budget micro-influencer collaborations."
    )

    pdf.add_subsection_heading("1. Product-Led Virality (In-App Growth Loops)")
    pdf.add_bullet("Shareable 'Flex' Cards:", "When a user finishes a 7-day streak or 4 hours of deep work, auto-generate an aesthetic graphic.")
    pdf.add_bullet("Instagram Story Ready:", "Format 9:16 with user's name, streak count, and 'Tracked on LifeTrack Pro' logo. Students love to show consistency.")
    pdf.add_bullet("Study Room Accountability Invites:", "Encourage users to invite study partners: 'Study with friend in real-time Pomodoro room.'")

    pdf.add_subsection_heading("2. The Rs. 2,000 - 5,000 Micro-Influencer Strategy")
    pdf.add_paragraph(
        "Never spend money on large 100k+ influencers. Their audience is cold and conversion is terrible. "
        "Instead, partner with dedicated 'Study-tubers' and exam prep creators with 3,000 to 15,000 followers."
    )
    pdf.add_callout(
        "Micro-Creator DM Outreach Script",
        [
            "Subject: Love your study routines! Quick collaboration?",
            "Hey [Name], I really admire your discipline in your recent [NEET/UPSC/Code] study vlogs.",
            "I am an independent developer and built 'LifeTrack Pro' - a distraction-free study operating system.",
            "I would love to give you lifetime free VIP access for you and your community.",
            "If you find it genuinely valuable, I would be happy to offer a small sponsorship token of Rs. 500 - Rs. 1,000",
            "for an authentic review reel/mention in your next study vlog. Let me know if you would like to test it out!"
        ],
        theme="green"
    )
    pdf.add_bullet("Target:", "5 micro-creators @ Rs. 800-1,000 each = Rs. 4,000 to 5,000 total spend. Expected reach: 25k-50k highly targeted aspirants.")

    # PAGE BREAK FOR PART 5
    pdf.new_page()
    pdf.add_section_heading("PART 5", "Retention Engineering (Preventing Zombie / Ghost Users)")
    pdf.add_paragraph(
        "A user who downloads and never opens the app is useless. To build a sticky, habit-forming app, "
        "optimize the first 24 hours and establish intelligent notification hooks."
    )

    pdf.add_subsection_heading("1. The 60-Second Onboarding Rule (Immediate 'Aha!' Moment)")
    pdf.add_checklist_item(False, "Zero Friction First Step", "Do not force lengthy profile forms before value. Let user pick 1 goal or launch 1 focus timer immediately.")
    pdf.add_checklist_item(False, "Default Preset Templates", "Provide pre-built templates for 'NEET Physics Backlog', 'JEE Math Marathon', 'UPSC Prelims Map'.")
    pdf.add_checklist_item(False, "Instant Reward", "Celebrate the first logged task with a subtle haptic vibrate and 'Day 1 Streak Started' badge.")

    pdf.add_subsection_heading("2. Smart Notification Architecture (Human, Not Spam)")
    pdf.add_paragraph("Generic notifications get uninstalled. Contextual, encouraging nudges create lifelong habits.")
    pdf.add_bullet("Morning Kickoff (07:30 AM):", "'Today is a fresh canvas. Tap to view your top 3 milestone priorities.'")
    pdf.add_bullet("Midday Backlog Check (02:00 PM):", "'Afternoon slump? A quick 25-min Pomodoro session will keep your momentum alive.'")
    pdf.add_bullet("Night Streak Saver (09:15 PM):", "'Streak Alert: You are 1 session away from preserving your 5-day streak! Don't let it reset.'")

    pdf.add_subsection_heading("3. Key Retention Metrics to Monitor")
    pdf.add_bullet("Day 1 Retention (Target > 40%):", "Percentage of new users who open the app again within 24 hours.")
    pdf.add_bullet("Day 7 Retention (Target > 20%):", "Users who are still active after one week (these are your core power users).")
    pdf.add_bullet("Streak Completion Rate:", "Ratio of started focus timers vs completed focus timers. Shows if timer length is optimal.")

    # PAGE BREAK FOR PART 6
    pdf.new_page()
    pdf.add_section_heading("PART 6", "The 30-Day Step-by-Step Daily Execution Checklist")
    pdf.add_paragraph("Break down your marketing into simple, non-negotiable daily tasks across 4 weeks:")

    pdf.add_subsection_heading("Week 1: Setup & First 50 Users (Foundation)")
    pdf.add_checklist_item(False, "Day 1-2", "Setup Telegram channel + discussion group, WhatsApp VIP community, and unified social handles.")
    pdf.add_checklist_item(False, "Day 3", "Polish Play Store listing: Title, Short Description, bold benefit banners on screenshots.")
    pdf.add_checklist_item(False, "Day 4", "Post initial story on r/JEENEETards and r/productivity. Engage with every commenter.")
    pdf.add_checklist_item(False, "Day 5-6", "Share personalized link in college groups and study libraries. Onboard first 30 users into WhatsApp.")
    pdf.add_checklist_item(False, "Day 7", "Hold 1-on-1 chats with top 5 most active users. Fix reported friction points.")

    pdf.add_subsection_heading("Week 2: Content Engine Launch (50 to 200 Users)")
    pdf.add_checklist_item(False, "Day 8-10", "Batch-record 7 aesthetic Reels/Shorts (desk setups, backlog breakdown, Pomodoro timer).")
    pdf.add_checklist_item(False, "Day 11-14", "Publish 1 Short & 1 Reel daily. Reply to all video comments and direct viewers to bio link.")

    pdf.add_subsection_heading("Week 3: Community & Habit Formation (200 to 500 Users)")
    pdf.add_checklist_item(False, "Day 15-18", "Start daily #study-streak challenge in Telegram. Encourage users to post screenshot of their routine strip.")
    pdf.add_checklist_item(False, "Day 19-21", "Reach out to 15 micro study-tubers with barter pitch. Secure 3 creator reviews.")

    pdf.add_subsection_heading("Week 4: Scaling & Virality Loops (500 to 1,000+ Users)")
    pdf.add_checklist_item(False, "Day 22-25", "Deploy shareable Instagram story streak cards in app update. Announce in community.")
    pdf.add_checklist_item(False, "Day 26-28", "Run library QR sticker campaign across 5 local study halls.")
    pdf.add_checklist_item(False, "Day 29-30", "Analyze Day 1 & Day 7 retention numbers. Plan Phase 3 scaling.")

    # APPENDIX / TOOL STACK
    pdf.add_spacer(10)
    pdf.add_section_heading("APPENDIX", "Recommended 100% Free Tool Stack")
    pdf.add_bullet("Visuals & Assets:", "Canva Free (for screenshots, banners, posters) + Unsplash (aesthetic backgrounds).")
    pdf.add_bullet("Video Editing:", "CapCut or VN Editor (Lo-Fi filters, dynamic text overlays, auto-captions).")
    pdf.add_bullet("Tracking & Analytics:", "PostHog Free Tier or Supabase Dashboard (track Daily Active Users & retention).")
    pdf.add_bullet("Link Management:", "Dub.co or Bitly (branded shortlinks with country and platform click attribution).")

    pdf.build()
    print(f"Successfully generated playbook PDF at: {pdf_path}")

if __name__ == "__main__":
    out_dir = "/Users/abhishek/Desktop/LifeTrackPro/docs"
    os.makedirs(out_dir, exist_ok=True)
    target_pdf = os.path.join(out_dir, "LifeTrackPro_Marketing_Workflow.pdf")
    generate_playbook(target_pdf)

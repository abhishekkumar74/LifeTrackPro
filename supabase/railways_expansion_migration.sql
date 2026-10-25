--
-- RAILWAYS & POLICE CATALOGUE EXPANSION MIGRATION
-- Idempotent & Zero-Duplicate architecture
--
BEGIN;

-- Temporary variables block for dynamic IDs
DO $$
DECLARE
  v_exam_id UUID;
  v_subject_id UUID;
  v_es_id UUID;
BEGIN
  -- ----------------------------------------------------
  -- EXAM: RRB ALP (Assistant Loco Pilot) (rrb-alp)
  -- ----------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES (
    'RRB ALP (Assistant Loco Pilot)',
    'rrb-alp',
    'student',
    'sarkari',
    950,
    'Railway Recruitment Board Assistant Loco Pilot (CBT 1 & CBT 2)',
    '#EA580C',
    'train',
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    exam_type = EXCLUDED.exam_type,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name,
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO v_exam_id;

  -- Subject: Mathematics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Mathematics', 'MATH', '#3B82F6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Mathematics', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-alp -> Mathematics
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Number System & BODMAS', 1, 6),
    (v_es_id, 'Fractions, Decimals & LCM-HCF', 2, 6),
    (v_es_id, 'Ratio, Proportion & Percentage', 3, 8),
    (v_es_id, 'Mensuration (2D & 3D)', 4, 10),
    (v_es_id, 'Time & Work, Pipes & Cisterns', 5, 8),
    (v_es_id, 'Time, Speed & Distance', 6, 8),
    (v_es_id, 'Simple & Compound Interest', 7, 6),
    (v_es_id, 'Profit, Loss & Discount', 8, 6),
    (v_es_id, 'Algebra, Linear & Quadratic Equations', 9, 8),
    (v_es_id, 'Geometry & Trigonometry', 10, 10),
    (v_es_id, 'Elementary Statistics & Age Problems', 11, 6);

  -- Subject: General Intelligence & Reasoning
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Intelligence & Reasoning', 'REAS', '#8B5CF6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Intelligence & Reasoning', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-alp -> General Intelligence & Reasoning
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Analogies & Number/Alphabet Series', 1, 6),
    (v_es_id, 'Coding-Decoding & Blood Relations', 2, 6),
    (v_es_id, 'Mathematical Operations & Syllogism', 3, 6),
    (v_es_id, 'Venn Diagrams & Data Sufficiency', 4, 6),
    (v_es_id, 'Direction Sense & Ranking Tests', 5, 6),
    (v_es_id, 'Statements, Conclusions & Decisions', 6, 6),
    (v_es_id, 'Analytical & Non-Verbal Reasoning', 7, 8);

  -- Subject: Basic Science & Engineering
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Basic Science & Engineering', 'BSE_ALP', '#10B981', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Basic Science & Engineering', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-alp -> Basic Science & Engineering
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Engineering Drawing (Views, Projections & Instruments)', 1, 10),
    (v_es_id, 'Units, Measurements & Dimensions', 2, 6),
    (v_es_id, 'Mass, Weight & Density', 3, 6),
    (v_es_id, 'Work, Power & Energy', 4, 8),
    (v_es_id, 'Speed, Velocity & Acceleration', 5, 8),
    (v_es_id, 'Heat, Temperature & Thermal Expansion', 6, 8),
    (v_es_id, 'Basic Electricity & Circuits', 7, 10),
    (v_es_id, 'Levers, Pulleys & Simple Machines', 8, 8),
    (v_es_id, 'Occupational Health & Safety Protocols', 9, 6),
    (v_es_id, 'Environment Education & IT Literacy', 10, 6);

  -- Subject: General Awareness & Current Affairs
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Awareness & Current Affairs', 'GA_CA', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Awareness & Current Affairs', 4)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-alp -> General Awareness & Current Affairs
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Science & Technology Innovations', 1, 6),
    (v_es_id, 'Indian Railways Network & History', 2, 6),
    (v_es_id, 'Sports, Awards & Major Personalities', 3, 6),
    (v_es_id, 'Current Events (National & Global)', 4, 8),
    (v_es_id, 'Indian Polity & Economic Fundamentals', 5, 8);

  -- Subject: Technical Trade Theory (Part B Qualifying)
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Technical Trade Theory (Part B Qualifying)', 'TRADE_TH', '#EC4899', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Technical Trade Theory (Part B Qualifying)', 5)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-alp -> Technical Trade Theory (Part B Qualifying)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Electrical & Wireman Fundamentals', 1, 10),
    (v_es_id, 'Fitter, Turner & Machinist Trade Theory', 2, 10),
    (v_es_id, 'Diesel Mechanic & Automobile Systems', 3, 10),
    (v_es_id, 'Electronic Mechanics & Instruments', 4, 10);

  -- ----------------------------------------------------
  -- EXAM: RRB Technician (Grade 1 & 3) (rrb-technician)
  -- ----------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES (
    'RRB Technician (Grade 1 & 3)',
    'rrb-technician',
    'student',
    'sarkari',
    945,
    'Signal, Telecommunication & Workshop Technicians Recruitment',
    '#0284C7',
    'tool',
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    exam_type = EXCLUDED.exam_type,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name,
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO v_exam_id;

  -- Subject: Mathematics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Mathematics', 'MATH', '#3B82F6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Mathematics', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-technician -> Mathematics
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Number System & Simplification', 1, 6),
    (v_es_id, 'Percentages, Ratio & Proportion', 2, 8),
    (v_es_id, 'Profit, Loss, Discount & Interest', 3, 8),
    (v_es_id, 'Time & Work, Time, Speed & Distance', 4, 8),
    (v_es_id, 'Algebra & Coordinate Geometry', 5, 10),
    (v_es_id, 'Trigonometry, Heights & Distances', 6, 10),
    (v_es_id, 'Mensuration & Surface Areas', 7, 8),
    (v_es_id, 'Statistics & Probability', 8, 6);

  -- Subject: General Intelligence & Reasoning
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Intelligence & Reasoning', 'REAS', '#8B5CF6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Intelligence & Reasoning', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-technician -> General Intelligence & Reasoning
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Verbal & Number Series', 1, 6),
    (v_es_id, 'Coding-Decoding & Cryptography', 2, 6),
    (v_es_id, 'Puzzles & Seating Arrangements', 3, 8),
    (v_es_id, 'Venn Diagrams & Syllogisms', 4, 6),
    (v_es_id, 'Analytical Reasoning & Blood Relations', 5, 6),
    (v_es_id, 'Non-Verbal Pattern Completion', 6, 6);

  -- Subject: Basics of Computers & Applications
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Basics of Computers & Applications', 'COMP_APP', '#6366F1', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Basics of Computers & Applications', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-technician -> Basics of Computers & Applications
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Computer Architecture & Hardware', 1, 6),
    (v_es_id, 'Operating Systems (Windows, Linux basics)', 2, 6),
    (v_es_id, 'MS Office (Word, Excel, PowerPoint)', 3, 6),
    (v_es_id, 'Data Representation & Binary Systems', 4, 6),
    (v_es_id, 'Networking, LAN, WAN & Internet Protocols', 5, 8),
    (v_es_id, 'Cyber Security & Malware Protection', 6, 6);

  -- Subject: Basic Science & Engineering Physics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Basic Science & Engineering Physics', 'PHYS_TECH', '#10B981', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Basic Science & Engineering Physics', 4)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-technician -> Basic Science & Engineering Physics
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Units, Dimensions & Error Analysis', 1, 6),
    (v_es_id, 'Mechanics, Forces & Laws of Motion', 2, 8),
    (v_es_id, 'Work, Power, Energy & Friction', 3, 8),
    (v_es_id, 'Heat, Thermodynamics & Waves', 4, 8),
    (v_es_id, 'Optics, Sound & Wave Motion', 5, 8),
    (v_es_id, 'Electrostatics, Current Electricity & Magnetism', 6, 10),
    (v_es_id, 'Basic Electronics, Diodes & Transistors', 7, 10);

  -- Subject: General Awareness
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Awareness', 'GA', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Awareness', 5)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-technician -> General Awareness
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'National & International Affairs', 1, 6),
    (v_es_id, 'Indian Geography & Infrastructure', 2, 6),
    (v_es_id, 'Constitution, Polity & Governance', 3, 6),
    (v_es_id, 'Environmental Science & Ecology', 4, 6);

  -- ----------------------------------------------------
  -- EXAM: RRB JE (Junior Engineer) (rrb-je)
  -- ----------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES (
    'RRB JE (Junior Engineer)',
    'rrb-je',
    'student',
    'sarkari',
    940,
    'Civil, Mechanical, Electrical, Electronics & IT Junior Engineers',
    '#2563EB',
    'cpu',
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    exam_type = EXCLUDED.exam_type,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name,
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO v_exam_id;

  -- Subject: Mathematics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Mathematics', 'MATH', '#3B82F6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Mathematics', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-je -> Mathematics
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Number Systems, Polynomials & Algebra', 1, 8),
    (v_es_id, 'Ratio, Proportion, Percentage & Average', 2, 8),
    (v_es_id, 'Time & Work, Time & Distance, SI & CI', 3, 8),
    (v_es_id, 'Geometry, Mensuration & Trigonometry', 4, 10),
    (v_es_id, 'Coordinate Geometry & Vectors', 5, 8),
    (v_es_id, 'Differential Calculus & Integrals Basics', 6, 10),
    (v_es_id, 'Statistics, Mean, Median & Probability', 7, 6);

  -- Subject: General Intelligence & Reasoning
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Intelligence & Reasoning', 'REAS', '#8B5CF6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Intelligence & Reasoning', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-je -> General Intelligence & Reasoning
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Syllogisms, Analogies & Series', 1, 6),
    (v_es_id, 'Blood Relations, Directions & Puzzles', 2, 6),
    (v_es_id, 'Data Interpretation & Venn Diagrams', 3, 6),
    (v_es_id, 'Critical Reasoning & Decision Making', 4, 6),
    (v_es_id, 'Spatial Visualization & Pattern Matching', 5, 6);

  -- Subject: General Science (Physics & Chemistry up to 10th)
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Science (Physics & Chemistry up to 10th)', 'SCI_JE', '#10B981', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Science (Physics & Chemistry up to 10th)', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-je -> General Science (Physics & Chemistry up to 10th)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Kinematics, Dynamics & Gravitation', 1, 8),
    (v_es_id, 'Fluids, Surface Tension & Viscosity', 2, 8),
    (v_es_id, 'Heat, Sound & Wave Motion', 3, 8),
    (v_es_id, 'Current Electricity, Magnetic Effects & Induction', 4, 10),
    (v_es_id, 'Chemical Reactions, Acids, Bases & Salts', 5, 8),
    (v_es_id, 'Periodic Classification & Metals-Nonmetals', 6, 8),
    (v_es_id, 'Organic Carbon Compounds & Everyday Chemistry', 7, 8);

  -- Subject: Basics of Computers & Applications
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Basics of Computers & Applications', 'COMP_APP', '#6366F1', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Basics of Computers & Applications', 4)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-je -> Basics of Computers & Applications
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Architecture, CPU, Input/Output & Memory', 1, 6),
    (v_es_id, 'Operating Systems & File Management', 2, 6),
    (v_es_id, 'Algorithms, Flowcharts & Data Representation', 3, 6),
    (v_es_id, 'Networks, Internet, Email & Web Browsers', 4, 6);

  -- Subject: Environment & Pollution Control
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Environment & Pollution Control', 'ENV_POLL', '#059669', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Environment & Pollution Control', 5)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-je -> Environment & Pollution Control
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Ecosystem & Biodiversity Conservation', 1, 6),
    (v_es_id, 'Air & Water Pollution Control Standards', 2, 6),
    (v_es_id, 'Noise & Solid Waste Management', 3, 6),
    (v_es_id, 'Global Warming, Climate Change & Ozone Layer', 4, 6),
    (v_es_id, 'Environmental Protection Acts & Treatment', 5, 6);

  -- Subject: Technical Engineering Core
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Technical Engineering Core', 'TECH_CORE', '#DC2626', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Technical Engineering Core', 6)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-je -> Technical Engineering Core
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Engineering Mechanics & Strength of Materials', 1, 12),
    (v_es_id, 'Fluid Mechanics & Hydraulic Machines', 2, 10),
    (v_es_id, 'Electrical Circuits, Machines & Measurements', 3, 12),
    (v_es_id, 'Electronic Devices, Digital Circuits & Microprocessors', 4, 12),
    (v_es_id, 'Building Materials, Surveying & Concrete Tech', 5, 12);

  -- ----------------------------------------------------
  -- EXAM: RPF Constable (rpf-constable)
  -- ----------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES (
    'RPF Constable',
    'rpf-constable',
    'student',
    'sarkari',
    935,
    'Railway Protection Force Constable Recruitment (120 Marks CBT)',
    '#B45309',
    'shield',
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    exam_type = EXCLUDED.exam_type,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name,
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO v_exam_id;

  -- Subject: General Awareness
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Awareness', 'GA', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Awareness', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rpf-constable -> General Awareness
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Indian Freedom Struggle & Modern History', 1, 8),
    (v_es_id, 'Indian Art, Culture & Heritage', 2, 6),
    (v_es_id, 'Indian & World Geography', 3, 8),
    (v_es_id, 'Indian Polity & Constitution of India', 4, 8),
    (v_es_id, 'General Science (Physics, Chemistry, Life Sciences)', 5, 10),
    (v_es_id, 'Current Affairs (National & International)', 6, 8),
    (v_es_id, 'Sports, Cups, Trophies & Personalities', 7, 6),
    (v_es_id, 'Railway Knowledge & Security Protocol', 8, 6);

  -- Subject: Arithmetic
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Arithmetic', 'ARITH', '#3B82F6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Arithmetic', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rpf-constable -> Arithmetic
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Number Systems & Whole Numbers', 1, 6),
    (v_es_id, 'Decimals, Fractions & BODMAS', 2, 6),
    (v_es_id, 'Percentages, Ratio & Proportion', 3, 8),
    (v_es_id, 'Averages & Age Problems', 4, 6),
    (v_es_id, 'Profit, Loss & Discount', 5, 6),
    (v_es_id, 'Simple & Compound Interest', 6, 6),
    (v_es_id, 'Time & Work, Pipes & Cisterns', 7, 8),
    (v_es_id, 'Time, Speed & Distance', 8, 8),
    (v_es_id, 'Mensuration (Perimeter, Area & Volume)', 9, 8);

  -- Subject: General Intelligence & Reasoning
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Intelligence & Reasoning', 'REAS', '#8B5CF6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Intelligence & Reasoning', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rpf-constable -> General Intelligence & Reasoning
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Analogies & Similarities', 1, 6),
    (v_es_id, 'Spatial Orientation & Visual Memory', 2, 6),
    (v_es_id, 'Coding-Decoding & Odd One Out', 3, 6),
    (v_es_id, 'Blood Relations & Family Tree', 4, 6),
    (v_es_id, 'Direction & Distance Tests', 5, 6),
    (v_es_id, 'Number & Letter Series', 6, 6),
    (v_es_id, 'Syllogisms & Venn Diagrams', 7, 6),
    (v_es_id, 'Non-Verbal Pattern & Mirror Images', 8, 6);

  -- ----------------------------------------------------
  -- EXAM: RPF Sub-Inspector (SI) (rpf-si)
  -- ----------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES (
    'RPF Sub-Inspector (SI)',
    'rpf-si',
    'student',
    'sarkari',
    930,
    'Railway Protection Force Sub-Inspector Recruitment (Graduate Level)',
    '#7C3AED',
    'award',
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    exam_type = EXCLUDED.exam_type,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name,
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO v_exam_id;

  -- Subject: General Awareness
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Awareness', 'GA', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Awareness', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rpf-si -> General Awareness
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Ancient, Medieval & Modern Indian History', 1, 10),
    (v_es_id, 'Indian National Movement & Freedom Struggle', 2, 8),
    (v_es_id, 'Physical, Social & Economic Geography of India', 3, 8),
    (v_es_id, 'Indian Constitution, Fundamental Rights & Duties', 4, 10),
    (v_es_id, 'Executive, Judiciary & Parliamentary Procedures', 5, 8),
    (v_es_id, 'Indian Economy, Banking & Budgetary Concepts', 6, 8),
    (v_es_id, 'General Science & Scientific Innovations', 7, 10),
    (v_es_id, 'Global Treaties, National Defense & Security', 8, 6),
    (v_es_id, 'Current Affairs, Awards & Sports Records', 9, 8);

  -- Subject: Arithmetic & Quantitative Aptitude
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Arithmetic & Quantitative Aptitude', 'QA', '#3B82F6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Arithmetic & Quantitative Aptitude', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rpf-si -> Arithmetic & Quantitative Aptitude
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Advanced Number Systems & Factors', 1, 6),
    (v_es_id, 'Percentages, Profit, Loss & Discount', 2, 8),
    (v_es_id, 'Ratio, Proportion & Mixtures-Alligations', 3, 8),
    (v_es_id, 'Simple & Compound Interest (Installments)', 4, 8),
    (v_es_id, 'Time & Work, Efficiency & Wages', 5, 8),
    (v_es_id, 'Time, Speed, Distance, Trains & Boats', 6, 8),
    (v_es_id, 'Mensuration (2D Geometric Figures & 3D Solids)', 7, 10),
    (v_es_id, 'Data Interpretation (Tables, Bar & Pie Charts)', 8, 8);

  -- Subject: General Intelligence & Logical Reasoning
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Intelligence & Logical Reasoning', 'LR', '#8B5CF6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Intelligence & Logical Reasoning', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rpf-si -> General Intelligence & Logical Reasoning
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Syllogistic Deductions & Venn Diagrams', 1, 6),
    (v_es_id, 'Seating Arrangements (Circular, Linear & Floor)', 2, 8),
    (v_es_id, 'Complex Puzzles & Tabulation', 3, 8),
    (v_es_id, 'Direction Sense & Distance Calculations', 4, 6),
    (v_es_id, 'Blood Relations & Coded Hierarchy', 5, 6),
    (v_es_id, 'Statement & Assumptions, Arguments & Conclusions', 6, 6),
    (v_es_id, 'Critical & Analytical Decision Making', 7, 6),
    (v_es_id, 'Non-Verbal Reasoning, Cubes & Dices', 8, 6);

  -- ----------------------------------------------------
  -- EXAM: RRB Ministerial & Isolated Categories (rrb-ministerial)
  -- ----------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES (
    'RRB Ministerial & Isolated Categories',
    'rrb-ministerial',
    'student',
    'sarkari',
    895,
    'Junior Stenographer, Translator, Welfare Inspector & Law Assistant',
    '#0D9488',
    'briefcase',
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    exam_type = EXCLUDED.exam_type,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name,
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO v_exam_id;

  -- Subject: Professional Ability
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Professional Ability', 'PROF_MIN', '#6366F1', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Professional Ability', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-ministerial -> Professional Ability
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Office Management & Secretarial Practice', 1, 10),
    (v_es_id, 'Official Language Rules (Rajbhasha Adhiniyam)', 2, 8),
    (v_es_id, 'Industrial & Labour Laws, Welfare Provisions', 3, 10),
    (v_es_id, 'Right to Information (RTI Act) & Conduct Rules', 4, 8),
    (v_es_id, 'Shorthand, Transcription & Hindi/English Grammar', 5, 10);

  -- Subject: General Awareness
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Awareness', 'GA', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Awareness', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-ministerial -> General Awareness
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Indian Constitution, Polity & Governance', 1, 6),
    (v_es_id, 'Current Affairs (National & International)', 2, 6),
    (v_es_id, 'Indian History, Freedom Struggle & Geography', 3, 8),
    (v_es_id, 'Everyday Science & Technology Developments', 4, 6);

  -- Subject: General Intelligence & Reasoning
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Intelligence & Reasoning', 'REAS', '#8B5CF6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Intelligence & Reasoning', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-ministerial -> General Intelligence & Reasoning
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Analogies, Alphabet & Number Series', 1, 6),
    (v_es_id, 'Coding-Decoding & Blood Relations', 2, 6),
    (v_es_id, 'Logical Deduction, Syllogisms & Venn Diagrams', 3, 6),
    (v_es_id, 'Direction Sense & Analytical Reasoning', 4, 6);

  -- Subject: Mathematics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Mathematics', 'MATH', '#3B82F6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Mathematics', 4)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-ministerial -> Mathematics
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Number Systems, Decimals & Fractions', 1, 6),
    (v_es_id, 'Percentages, Ratio, Proportion & Averages', 2, 6),
    (v_es_id, 'Profit, Loss, SI & CI', 3, 6),
    (v_es_id, 'Time & Work, Time & Distance', 4, 6);

  -- Subject: General Science
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Science', 'GEN_SCI', '#10B981', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Science', 5)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-ministerial -> General Science
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Physics (Mechanics, Optics, Electricity)', 1, 6),
    (v_es_id, 'Chemistry (Matter, Solutions, Chemical Equations)', 2, 6),
    (v_es_id, 'Biology (Human Physiology, Health & Diseases)', 3, 6);

  -- ----------------------------------------------------
  -- EXAM: RRB Paramedical Categories (rrb-paramedical)
  -- ----------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES (
    'RRB Paramedical Categories',
    'rrb-paramedical',
    'student',
    'sarkari',
    890,
    'Staff Nurse, Pharmacist, Lab Technician & Radiographer Recruitment',
    '#E11D48',
    'activity',
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    exam_type = EXCLUDED.exam_type,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name,
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO v_exam_id;

  -- Subject: Professional Ability (Medical & Healthcare)
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Professional Ability (Medical & Healthcare)', 'PROF_PARAMED', '#E11D48', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Professional Ability (Medical & Healthcare)', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-paramedical -> Professional Ability (Medical & Healthcare)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Human Anatomy, Physiology & Pathology', 1, 12),
    (v_es_id, 'Microbiology, Infection Control & Immunology', 2, 10),
    (v_es_id, 'Pharmacology, Dosage Forms & Drug Actions', 3, 12),
    (v_es_id, 'Medical-Surgical Nursing & Patient Care', 4, 12),
    (v_es_id, 'Biochemistry, Hematology & Clinical Pathology', 5, 10),
    (v_es_id, 'Community Health, First Aid & Hospital Protocols', 6, 8);

  -- Subject: General Science
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Science', 'GEN_SCI', '#10B981', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Science', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-paramedical -> General Science
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Cell Biology, Genetics & Human Systems', 1, 6),
    (v_es_id, 'Basic Physics (Light, Sound, Radiation Safety)', 2, 6),
    (v_es_id, 'Basic Chemistry (Solutions, Acids-Bases, Drugs)', 3, 6);

  -- Subject: General Arithmetic & Reasoning
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Arithmetic & Reasoning', 'ARITH_REAS', '#3B82F6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Arithmetic & Reasoning', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-paramedical -> General Arithmetic & Reasoning
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Basic Arithmetic, Percentages & Ratios', 1, 6),
    (v_es_id, 'Numerical Series, Analogies & Coding', 2, 6),
    (v_es_id, 'Direction Sense, Family Relations & Logic', 3, 6);

  -- Subject: General Awareness
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Awareness', 'GA', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Awareness', 4)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-paramedical -> General Awareness
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'National Health Missions & Health Protocols', 1, 6),
    (v_es_id, 'Current Affairs & Healthcare Milestones', 2, 6),
    (v_es_id, 'Indian Polity, Culture & General Knowledge', 3, 6);

  -- ----------------------------------------------------
  -- EXAM: RRB Section Controller (Traffic & Operations) (rrb-section-controller)
  -- ----------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES (
    'RRB Section Controller (Traffic & Operations)',
    'rrb-section-controller',
    'student',
    'sarkari',
    885,
    'Train Traffic Movement, Signalling & Section Control (Level 6 Direct/LDCE)',
    '#4F46E5',
    'compass',
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    exam_type = EXCLUDED.exam_type,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name,
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO v_exam_id;

  -- Subject: Railway Operating Rules & Section Control (G&SR)
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Railway Operating Rules & Section Control (G&SR)', 'GSR_OPER', '#DC2626', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Railway Operating Rules & Section Control (G&SR)', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-section-controller -> Railway Operating Rules & Section Control (G&SR)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'General & Subsidiary Rules (G&SR) & Block Working', 1, 12),
    (v_es_id, 'Train Ordering, Control Charting & Traffic Priorities', 2, 10),
    (v_es_id, 'Absolute Block & Automatic Block Signalling Systems', 3, 10),
    (v_es_id, 'Caution Orders, Speed Restrictions & Line Block Protocol', 4, 8),
    (v_es_id, 'Unusual Occurrences, Accidents & Relief Train Protocols', 5, 10),
    (v_es_id, 'Freight & Passenger Train Scheduling & Punctuality', 6, 8);

  -- Subject: General Studies & Railway Infrastructure
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Studies & Railway Infrastructure', 'GS_RAIL', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Studies & Railway Infrastructure', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-section-controller -> General Studies & Railway Infrastructure
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Indian Railways Organization, Zones & Divisions', 1, 8),
    (v_es_id, 'Railway Budget, Operating Ratio & Freight Earnings', 2, 6),
    (v_es_id, 'Indian Geography (Railway Routes & Dedicated Freight Corridors)', 3, 8),
    (v_es_id, 'Indian Constitution & Administrative Law', 4, 6),
    (v_es_id, 'Science & Technology in Railways (Kavach, Vande Bharat)', 5, 6);

  -- Subject: Advanced Quantitative Aptitude
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Advanced Quantitative Aptitude', 'ADV_QA', '#3B82F6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Advanced Quantitative Aptitude', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-section-controller -> Advanced Quantitative Aptitude
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Number Systems, Factors & Equations', 1, 6),
    (v_es_id, 'Percentages, Ratio, Proportion & Averages', 2, 6),
    (v_es_id, 'Time, Speed, Distance, Train Crossings & Relative Speeds', 3, 8),
    (v_es_id, 'Time & Work, Pipe Cisterns & Resource Optimization', 4, 8),
    (v_es_id, 'Data Interpretation (Complex Tables, Multiple Charts)', 5, 8);

  -- Subject: General Intelligence & Critical Reasoning
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Intelligence & Critical Reasoning', 'REAS_CRIT', '#8B5CF6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam Subject Mapping
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Intelligence & Critical Reasoning', 4)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for rrb-section-controller -> General Intelligence & Critical Reasoning
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Critical Decision Making & Situational Analysis', 1, 8),
    (v_es_id, 'High-Complexity Puzzles & Scheduling Matrices', 2, 8),
    (v_es_id, 'Syllogisms, Logical Sequences & Statement-Action', 3, 6),
    (v_es_id, 'Analytical Reasoning & Information Processing', 4, 6);

END $$;

COMMIT;

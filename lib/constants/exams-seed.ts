export type ExamType = 'entrance' | 'sarkari' | 'board' | 'professional' | 'other';

export interface SeedChapter {
  name: string;
  order_index: number;
  estimated_hours?: number;
}

export interface SeedSubject {
  name: string;
  code?: string;
  color: string;
  order_index: number;
  chapters: SeedChapter[];
}

export interface SeedExam {
  id: string;
  name: string;
  slug: string;
  category: string;
  exam_type: ExamType;
  popularity_score: number;
  description: string;
  color: string;
  icon_name?: string;
  subjects: SeedSubject[];
}

export const SEED_EXAMS: SeedExam[] = [
  {
    id: 'neet-ug-seed',
    name: 'NEET UG',
    slug: 'neet',
    category: 'student',
    exam_type: 'entrance',
    popularity_score: 990,
    description: 'Medical entrance for MBBS/BDS aspirants',
    color: '#10B981',
    icon_name: 'activity',
    subjects: [
      {
        name: 'Physics',
        code: 'PHY',
        color: '#3B82F6',
        order_index: 1,
        chapters: [
          { name: 'Units & Measurements', order_index: 1, estimated_hours: 4 },
          { name: 'Kinematics & Motion', order_index: 2, estimated_hours: 8 },
          { name: 'Laws of Motion', order_index: 3, estimated_hours: 10 },
          { name: 'Work, Energy & Power', order_index: 4, estimated_hours: 8 },
          { name: 'Rotational Motion', order_index: 5, estimated_hours: 12 },
          { name: 'Gravitation', order_index: 6, estimated_hours: 6 },
          { name: 'Thermodynamics', order_index: 7, estimated_hours: 10 },
          { name: 'Electrostatics', order_index: 8, estimated_hours: 12 },
          { name: 'Current Electricity', order_index: 9, estimated_hours: 10 },
          { name: 'Ray & Wave Optics', order_index: 10, estimated_hours: 14 },
        ],
      },
      {
        name: 'Chemistry',
        code: 'CHEM',
        color: '#F59E0B',
        order_index: 2,
        chapters: [
          { name: 'Structure of Atom', order_index: 1, estimated_hours: 6 },
          { name: 'Chemical Bonding', order_index: 2, estimated_hours: 10 },
          { name: 'Thermodynamics', order_index: 3, estimated_hours: 8 },
          { name: 'Equilibrium', order_index: 4, estimated_hours: 10 },
          { name: 'Solutions & Electrochemistry', order_index: 5, estimated_hours: 12 },
          { name: 'Organic Chemistry Basics', order_index: 6, estimated_hours: 14 },
          { name: 'Hydrocarbons', order_index: 7, estimated_hours: 8 },
          { name: 'Biomolecules & Polymers', order_index: 8, estimated_hours: 6 },
        ],
      },
      {
        name: 'Biology',
        code: 'BIO',
        color: '#10B981',
        order_index: 3,
        chapters: [
          { name: 'Diversity in Living World', order_index: 1, estimated_hours: 8 },
          { name: 'Cell: Structure & Function', order_index: 2, estimated_hours: 10 },
          { name: 'Human Physiology', order_index: 3, estimated_hours: 20 },
          { name: 'Plant Physiology', order_index: 4, estimated_hours: 14 },
          { name: 'Genetics & Evolution', order_index: 5, estimated_hours: 18 },
          { name: 'Biotechnology & Applications', order_index: 6, estimated_hours: 8 },
          { name: 'Ecology & Environment', order_index: 7, estimated_hours: 10 },
        ],
      },
    ],
  },
  {
    id: 'jee-main-seed',
    name: 'JEE Main',
    slug: 'jee-main',
    category: 'student',
    exam_type: 'entrance',
    popularity_score: 980,
    description: 'Engineering entrance examination for NITs and IIITs',
    color: '#3B82F6',
    icon_name: 'cpu',
    subjects: [
      {
        name: 'Mathematics',
        code: 'MATH',
        color: '#8B5CF6',
        order_index: 1,
        chapters: [
          { name: 'Quadratic Equations & Complex Numbers', order_index: 1, estimated_hours: 8 },
          { name: 'Matrices & Determinants', order_index: 2, estimated_hours: 6 },
          { name: 'Coordinate Geometry', order_index: 3, estimated_hours: 16 },
          { name: 'Differential & Integral Calculus', order_index: 4, estimated_hours: 25 },
          { name: 'Vectors & 3D Geometry', order_index: 5, estimated_hours: 12 },
          { name: 'Probability & Statistics', order_index: 6, estimated_hours: 8 },
        ],
      },
      {
        name: 'Physics',
        code: 'PHY',
        color: '#3B82F6',
        order_index: 2,
        chapters: [
          { name: 'Mechanics & Newton Laws', order_index: 1, estimated_hours: 14 },
          { name: 'Rotational Dynamics', order_index: 2, estimated_hours: 12 },
          { name: 'Electromagnetism & AC', order_index: 3, estimated_hours: 16 },
          { name: 'Modern Physics & Semiconductors', order_index: 4, estimated_hours: 10 },
        ],
      },
      {
        name: 'Chemistry',
        code: 'CHEM',
        color: '#F59E0B',
        order_index: 3,
        chapters: [
          { name: 'Physical Chemistry', order_index: 1, estimated_hours: 15 },
          { name: 'Inorganic & Coordination Compounds', order_index: 2, estimated_hours: 15 },
          { name: 'Organic Reaction Mechanisms', order_index: 3, estimated_hours: 18 },
        ],
      },
    ],
  },
  {
    id: 'jee-adv-seed',
    name: 'JEE Advanced',
    slug: 'jee-advanced',
    category: 'student',
    exam_type: 'entrance',
    popularity_score: 950,
    description: 'Premier IIT Entrance Examination',
    color: '#6366F1',
    icon_name: 'zap',
    subjects: [
      {
        name: 'Mathematics',
        code: 'MATH',
        color: '#8B5CF6',
        order_index: 1,
        chapters: [
          { name: 'Advanced Calculus', order_index: 1, estimated_hours: 20 },
          { name: 'Vectors & Geometry', order_index: 2, estimated_hours: 15 },
          { name: 'Combinatorics & Probability', order_index: 3, estimated_hours: 12 },
        ],
      },
      {
        name: 'Physics',
        code: 'PHY',
        color: '#3B82F6',
        order_index: 2,
        chapters: [
          { name: 'Advanced Mechanics', order_index: 1, estimated_hours: 20 },
          { name: 'Electrodynamics', order_index: 2, estimated_hours: 18 },
        ],
      },
      {
        name: 'Chemistry',
        code: 'CHEM',
        color: '#F59E0B',
        order_index: 3,
        chapters: [
          { name: 'Organic Syntheses', order_index: 1, estimated_hours: 20 },
          { name: 'Thermodynamics & Kinetics', order_index: 2, estimated_hours: 15 },
        ],
      },
    ],
  },
  {
    id: 'btech-cse-seed',
    name: 'B.Tech Computer Science (CSE)',
    slug: 'btech-cse',
    category: 'student',
    exam_type: 'professional',
    popularity_score: 970,
    description: 'Complete 4-Year B.Tech CSE Curriculum: DSA, Core CS, System Design & SDE Placements',
    color: '#6366F1',
    icon_name: 'code',
    subjects: [
      {
        name: 'Data Structures & Algorithms',
        code: 'DSA',
        color: '#5B4FE8',
        order_index: 1,
        chapters: [
          { name: 'Arrays & Strings', order_index: 1, estimated_hours: 10 },
          { name: 'Linked List', order_index: 2, estimated_hours: 8 },
          { name: 'Stack & Queue', order_index: 3, estimated_hours: 8 },
          { name: 'Recursion & Backtracking', order_index: 4, estimated_hours: 10 },
          { name: 'Trees & Binary Search Trees', order_index: 5, estimated_hours: 15 },
          { name: 'Graphs & Algorithms', order_index: 6, estimated_hours: 18 },
          { name: 'Dynamic Programming', order_index: 7, estimated_hours: 20 },
        ],
      },
      {
        name: 'Computer Science Fundamentals',
        code: 'CS_CORE',
        color: '#3B82F6',
        order_index: 2,
        chapters: [
          { name: 'Operating Systems', order_index: 1, estimated_hours: 12 },
          { name: 'Computer Networks', order_index: 2, estimated_hours: 12 },
          { name: 'Database Management Systems (DBMS)', order_index: 3, estimated_hours: 12 },
          { name: 'System Design & High Level Architecture', order_index: 4, estimated_hours: 15 },
        ],
      },
      {
        name: 'Backend & System Design',
        code: 'BACKEND',
        color: '#10B981',
        order_index: 3,
        chapters: [
          { name: 'Java & Spring Boot Development', order_index: 1, estimated_hours: 15 },
          { name: 'REST APIs & Microservices', order_index: 2, estimated_hours: 12 },
          { name: 'Low Level Design & Design Patterns', order_index: 3, estimated_hours: 15 },
        ],
      },
    ],
  },
  {
    id: 'upsc-cse-seed',
    name: 'UPSC CSE',
    slug: 'upsc-cse',
    category: 'student',
    exam_type: 'sarkari',
    popularity_score: 970,
    description: 'Civil Services Examination (IAS, IPS, IFS)',
    color: '#D97706',
    icon_name: 'award',
    subjects: [
      {
        name: 'General Studies 1',
        code: 'GS1',
        color: '#D97706',
        order_index: 1,
        chapters: [
          { name: 'Modern Indian History', order_index: 1, estimated_hours: 20 },
          { name: 'Art & Culture', order_index: 2, estimated_hours: 15 },
          { name: 'Physical & Human Geography', order_index: 3, estimated_hours: 25 },
          { name: 'Indian Society & Diversity', order_index: 4, estimated_hours: 10 },
        ],
      },
      {
        name: 'General Studies 2',
        code: 'GS2',
        color: '#2563EB',
        order_index: 2,
        chapters: [
          { name: 'Indian Constitution & Polity', order_index: 1, estimated_hours: 30 },
          { name: 'Governance & Social Justice', order_index: 2, estimated_hours: 15 },
          { name: 'International Relations', order_index: 3, estimated_hours: 18 },
        ],
      },
      {
        name: 'General Studies 3',
        code: 'GS3',
        color: '#059669',
        order_index: 3,
        chapters: [
          { name: 'Indian Economy & Budgeting', order_index: 1, estimated_hours: 25 },
          { name: 'Agriculture & Food Processing', order_index: 2, estimated_hours: 12 },
          { name: 'Science & Technology', order_index: 3, estimated_hours: 14 },
          { name: 'Environment & Ecology', order_index: 4, estimated_hours: 18 },
          { name: 'Internal Security & Disaster Mgmt', order_index: 5, estimated_hours: 12 },
        ],
      },
      {
        name: 'Ethics (GS 4)',
        code: 'GS4',
        color: '#7C3AED',
        order_index: 4,
        chapters: [
          { name: 'Ethics & Human Interface', order_index: 1, estimated_hours: 15 },
          { name: 'Attitude & Aptitude', order_index: 2, estimated_hours: 15 },
          { name: 'Case Studies', order_index: 3, estimated_hours: 20 },
        ],
      },
      {
        name: 'CSAT',
        code: 'CSAT',
        color: '#F59E0B',
        order_index: 5,
        chapters: [
          { name: 'Reading Comprehension', order_index: 1, estimated_hours: 15 },
          { name: 'Logical Reasoning', order_index: 2, estimated_hours: 15 },
          { name: 'Basic Numeracy', order_index: 3, estimated_hours: 20 },
        ],
      },
      {
        name: 'Current Affairs',
        code: 'CA',
        color: '#EF4444',
        order_index: 6,
        chapters: [
          { name: 'Monthly Magazine Revision', order_index: 1, estimated_hours: 20 },
          { name: 'Daily Newspaper Analysis', order_index: 2, estimated_hours: 30 },
        ],
      },
    ],
  },
  {
    id: 'ssc-cgl-seed',
    name: 'SSC CGL',
    slug: 'ssc-cgl',
    category: 'student',
    exam_type: 'sarkari',
    popularity_score: 940,
    description: 'Combined Graduate Level Examination for Central Ministries',
    color: '#059669',
    icon_name: 'shield',
    subjects: [
      {
        name: 'Quantitative Aptitude',
        code: 'QA',
        color: '#2563EB',
        order_index: 1,
        chapters: [
          { name: 'Arithmetic (Percentage, Profit/Loss, SI/CI)', order_index: 1, estimated_hours: 20 },
          { name: 'Algebra & Number System', order_index: 2, estimated_hours: 15 },
          { name: 'Geometry & Mensuration', order_index: 3, estimated_hours: 20 },
          { name: 'Trigonometry & DI', order_index: 4, estimated_hours: 15 },
        ],
      },
      {
        name: 'Reasoning Ability',
        code: 'REAS',
        color: '#8B5CF6',
        order_index: 2,
        chapters: [
          { name: 'Analogies & Series', order_index: 1, estimated_hours: 8 },
          { name: 'Coding-Decoding & Blood Relations', order_index: 2, estimated_hours: 8 },
          { name: 'Syllogism & Non-Verbal', order_index: 3, estimated_hours: 10 },
        ],
      },
      {
        name: 'English Comprehension',
        code: 'ENG',
        color: '#EC4899',
        order_index: 3,
        chapters: [
          { name: 'Grammar Rules & Error Spotting', order_index: 1, estimated_hours: 12 },
          { name: 'Vocabulary & Idioms', order_index: 2, estimated_hours: 15 },
          { name: 'Reading Comprehension', order_index: 3, estimated_hours: 10 },
        ],
      },
      {
        name: 'General Awareness',
        code: 'GA',
        color: '#F59E0B',
        order_index: 4,
        chapters: [
          { name: 'History & Polity', order_index: 1, estimated_hours: 15 },
          { name: 'Science & Geography', order_index: 2, estimated_hours: 15 },
          { name: 'Current Affairs GK', order_index: 3, estimated_hours: 20 },
        ],
      },
    ],
  },
  {
    id: 'class-12-boards-seed',
    name: 'Class 12 Boards',
    slug: 'class-12-boards',
    category: 'student',
    exam_type: 'board',
    popularity_score: 930,
    description: 'CBSE / State Senior Secondary Examinations',
    color: '#0284C7',
    icon_name: 'book-open',
    subjects: [
      {
        name: 'Physics',
        code: 'PHY',
        color: '#3B82F6',
        order_index: 1,
        chapters: [
          { name: 'Electrostatics', order_index: 1, estimated_hours: 10 },
          { name: 'Current Electricity', order_index: 2, estimated_hours: 10 },
          { name: 'Magnetic Effects & AC', order_index: 3, estimated_hours: 12 },
          { name: 'Optics', order_index: 4, estimated_hours: 14 },
          { name: 'Modern Physics', order_index: 5, estimated_hours: 10 },
        ],
      },
      {
        name: 'Chemistry',
        code: 'CHEM',
        color: '#F59E0B',
        order_index: 2,
        chapters: [
          { name: 'Solutions', order_index: 1, estimated_hours: 8 },
          { name: 'Electrochemistry', order_index: 2, estimated_hours: 10 },
          { name: 'Chemical Kinetics', order_index: 3, estimated_hours: 8 },
          { name: 'Organic Compounds', order_index: 4, estimated_hours: 18 },
        ],
      },
      {
        name: 'Mathematics',
        code: 'MATH',
        color: '#8B5CF6',
        order_index: 3,
        chapters: [
          { name: 'Matrices & Determinants', order_index: 1, estimated_hours: 8 },
          { name: 'Calculus (Continuity & Integration)', order_index: 2, estimated_hours: 25 },
          { name: '3D Geometry & Vectors', order_index: 3, estimated_hours: 12 },
          { name: 'Probability', order_index: 4, estimated_hours: 8 },
        ],
      },
      {
        name: 'English',
        code: 'ENG',
        color: '#10B981',
        order_index: 4,
        chapters: [
          { name: 'Flamingo (Literature)', order_index: 1, estimated_hours: 12 },
          { name: 'Vistas (Supplementary)', order_index: 2, estimated_hours: 10 },
          { name: 'Writing Skills & Articles', order_index: 3, estimated_hours: 8 },
        ],
      },
    ],
  },
  {
    id: 'class-10-boards-seed',
    name: 'Class 10 Boards',
    slug: 'class-10-boards',
    category: 'student',
    exam_type: 'board',
    popularity_score: 900,
    description: 'Secondary School Examinations',
    color: '#0D9488',
    icon_name: 'book',
    subjects: [
      {
        name: 'Science',
        code: 'SCI',
        color: '#10B981',
        order_index: 1,
        chapters: [
          { name: 'Chemical Reactions & Equations', order_index: 1, estimated_hours: 6 },
          { name: 'Acids, Bases & Salts', order_index: 2, estimated_hours: 6 },
          { name: 'Life Processes', order_index: 3, estimated_hours: 8 },
          { name: 'Light - Reflection & Refraction', order_index: 4, estimated_hours: 8 },
          { name: 'Electricity', order_index: 5, estimated_hours: 8 },
        ],
      },
      {
        name: 'Mathematics',
        code: 'MATH',
        color: '#3B82F6',
        order_index: 2,
        chapters: [
          { name: 'Real Numbers & Polynomials', order_index: 1, estimated_hours: 6 },
          { name: 'Linear Equations & Quadratics', order_index: 2, estimated_hours: 8 },
          { name: 'Triangles & Trigonometry', order_index: 3, estimated_hours: 12 },
          { name: 'Surface Areas & Volumes', order_index: 4, estimated_hours: 8 },
        ],
      },
      {
        name: 'Social Science',
        code: 'SST',
        color: '#F59E0B',
        order_index: 3,
        chapters: [
          { name: 'History: Rise of Nationalism', order_index: 1, estimated_hours: 8 },
          { name: 'Geography: Resources & Agriculture', order_index: 2, estimated_hours: 8 },
          { name: 'Civics: Power Sharing & Federalism', order_index: 3, estimated_hours: 6 },
          { name: 'Economics: Development & Sectors', order_index: 4, estimated_hours: 6 },
        ],
      },
    ],
  },
  {
    id: 'cat-seed',
    name: 'CAT (IIMs / MBA)',
    slug: 'cat',
    category: 'student',
    exam_type: 'entrance',
    popularity_score: 910,
    description: 'Common Admission Test for MBA Admissions',
    color: '#7C3AED',
    icon_name: 'trending-up',
    subjects: [
      {
        name: 'Quantitative Aptitude (QA)',
        code: 'QA',
        color: '#2563EB',
        order_index: 1,
        chapters: [
          { name: 'Arithmetic', order_index: 1, estimated_hours: 20 },
          { name: 'Algebra', order_index: 2, estimated_hours: 18 },
          { name: 'Geometry', order_index: 3, estimated_hours: 15 },
          { name: 'Number System', order_index: 4, estimated_hours: 12 },
        ],
      },
      {
        name: 'Data Interpretation & LR',
        code: 'DILR',
        color: '#F59E0B',
        order_index: 2,
        chapters: [
          { name: 'Tables & Charts', order_index: 1, estimated_hours: 15 },
          { name: 'Arrangements & Puzzles', order_index: 2, estimated_hours: 20 },
          { name: 'Games & Tournaments', order_index: 3, estimated_hours: 10 },
        ],
      },
      {
        name: 'Verbal Ability & RC (VARC)',
        code: 'VARC',
        color: '#10B981',
        order_index: 3,
        chapters: [
          { name: 'Reading Comprehension Passages', order_index: 1, estimated_hours: 25 },
          { name: 'Para Jumbles & Summaries', order_index: 2, estimated_hours: 15 },
        ],
      },
    ],
  },
  {
    id: 'gate-seed',
    name: 'GATE',
    slug: 'gate',
    category: 'student',
    exam_type: 'entrance',
    popularity_score: 890,
    description: 'Graduate Aptitude Test in Engineering',
    color: '#EC4899',
    icon_name: 'terminal',
    subjects: [
      {
        name: 'Engineering Mathematics',
        code: 'EM',
        color: '#8B5CF6',
        order_index: 1,
        chapters: [
          { name: 'Linear Algebra & Calculus', order_index: 1, estimated_hours: 12 },
          { name: 'Probability & Discrete Math', order_index: 2, estimated_hours: 14 },
        ],
      },
      {
        name: 'General Aptitude',
        code: 'GA',
        color: '#F59E0B',
        order_index: 2,
        chapters: [
          { name: 'Numerical Ability', order_index: 1, estimated_hours: 10 },
          { name: 'Verbal Ability', order_index: 2, estimated_hours: 8 },
        ],
      },
      {
        name: 'Core Technical Engineering',
        code: 'TECH',
        color: '#3B82F6',
        order_index: 3,
        chapters: [
          { name: 'Core Subject Module 1', order_index: 1, estimated_hours: 25 },
          { name: 'Core Subject Module 2', order_index: 2, estimated_hours: 25 },
        ],
      },
    ],
  },
  {
    id: 'ibps-po-seed',
    name: 'IBPS PO / Clerk',
    slug: 'ibps-po',
    category: 'student',
    exam_type: 'sarkari',
    popularity_score: 880,
    description: 'Public Sector Banking Probationary Officer & Clerical',
    color: '#2563EB',
    icon_name: 'landmark',
    subjects: [
      {
        name: 'Quantitative Aptitude',
        code: 'QA',
        color: '#2563EB',
        order_index: 1,
        chapters: [
          { name: 'Simplification & Approximation', order_index: 1, estimated_hours: 10 },
          { name: 'Number Series & Quadratic Equations', order_index: 2, estimated_hours: 10 },
          { name: 'Data Interpretation', order_index: 3, estimated_hours: 18 },
        ],
      },
      {
        name: 'Reasoning Ability',
        code: 'REAS',
        color: '#8B5CF6',
        order_index: 2,
        chapters: [
          { name: 'Seating Arrangement & Puzzles', order_index: 1, estimated_hours: 25 },
          { name: 'Inequalities & Syllogism', order_index: 2, estimated_hours: 8 },
        ],
      },
      {
        name: 'English Language',
        code: 'ENG',
        color: '#EC4899',
        order_index: 3,
        chapters: [
          { name: 'Cloze Test & Reading Comprehension', order_index: 1, estimated_hours: 15 },
          { name: 'Error Detection & Sentence Correction', order_index: 2, estimated_hours: 12 },
        ],
      },
      {
        name: 'Banking & Financial Awareness',
        code: 'BANK',
        color: '#059669',
        order_index: 4,
        chapters: [
          { name: 'RBI Guidelines & Monetary Policy', order_index: 1, estimated_hours: 12 },
          { name: 'Current Financial News', order_index: 2, estimated_hours: 15 },
        ],
      },
    ],
  },
  {
    id: 'cuet-seed',
    name: 'CUET UG',
    slug: 'cuet',
    category: 'student',
    exam_type: 'entrance',
    popularity_score: 870,
    description: 'Central University Entrance Test',
    color: '#F59E0B',
    icon_name: 'compass',
    subjects: [
      {
        name: 'Language (English/Hindi)',
        code: 'LANG',
        color: '#10B981',
        order_index: 1,
        chapters: [{ name: 'Reading & Vocabulary', order_index: 1, estimated_hours: 15 }],
      },
      {
        name: 'Domain Specific Subjects',
        code: 'DOMAIN',
        color: '#3B82F6',
        order_index: 2,
        chapters: [{ name: 'Class 12 NCERT Core', order_index: 1, estimated_hours: 25 }],
      },
      {
        name: 'General Test',
        code: 'GT',
        color: '#8B5CF6',
        order_index: 3,
        chapters: [{ name: 'General Knowledge & Reasoning', order_index: 1, estimated_hours: 20 }],
      },
    ],
  },
  {
    id: 'ca-foundation-seed',
    name: 'CA Foundation',
    slug: 'ca-foundation',
    category: 'student',
    exam_type: 'professional',
    popularity_score: 850,
    description: 'ICAI Chartered Accountancy Entry Level Examination',
    color: '#4F46E5',
    icon_name: 'briefcase',
    subjects: [
      {
        name: 'Accounting',
        code: 'ACC',
        color: '#4F46E5',
        order_index: 1,
        chapters: [
          { name: 'Theoretical Framework & Accounting Process', order_index: 1, estimated_hours: 12 },
          { name: 'Bank Reconciliation & Depreciation', order_index: 2, estimated_hours: 10 },
          { name: 'Partnership Accounts & Company Accounts', order_index: 3, estimated_hours: 25 },
        ],
      },
      {
        name: 'Business Laws',
        code: 'LAW',
        color: '#D97706',
        order_index: 2,
        chapters: [
          { name: 'Indian Regulatory Framework', order_index: 1, estimated_hours: 8 },
          { name: 'The Indian Contract Act 1872', order_index: 2, estimated_hours: 20 },
          { name: 'The Sale of Goods Act & Companies Act', order_index: 3, estimated_hours: 18 },
        ],
      },
      {
        name: 'Quantitative Aptitude',
        code: 'QA',
        color: '#2563EB',
        order_index: 3,
        chapters: [
          { name: 'Business Mathematics & Time Value of Money', order_index: 1, estimated_hours: 20 },
          { name: 'Logical Reasoning', order_index: 2, estimated_hours: 12 },
          { name: 'Statistics & Probability', order_index: 3, estimated_hours: 18 },
        ],
      },
      {
        name: 'Business Economics',
        code: 'ECO',
        color: '#059669',
        order_index: 4,
        chapters: [
          { name: 'Demand & Supply Analysis', order_index: 1, estimated_hours: 10 },
          { name: 'Theory of Production & Cost', order_index: 2, estimated_hours: 12 },
          { name: 'Price Determination in Markets', order_index: 3, estimated_hours: 10 },
          { name: 'Indian Economy & Business Cycles', order_index: 4, estimated_hours: 12 },
        ],
      },
    ],
  },
  {
    id: 'nda-seed',
    name: 'NDA & NA',
    slug: 'nda',
    category: 'student',
    exam_type: 'sarkari',
    popularity_score: 860,
    description: 'National Defence Academy & Naval Academy Examination',
    color: '#7C3AED',
    icon_name: 'shield-check',
    subjects: [
      {
        name: 'Mathematics',
        code: 'MATH',
        color: '#3B82F6',
        order_index: 1,
        chapters: [
          { name: 'Algebra, Matrices & Determinants', order_index: 1, estimated_hours: 15 },
          { name: 'Trigonometry & Calculus', order_index: 2, estimated_hours: 20 },
          { name: 'Vector Algebra & Statistics', order_index: 3, estimated_hours: 15 },
        ],
      },
      {
        name: 'General Ability Test (GAT)',
        code: 'GAT',
        color: '#F59E0B',
        order_index: 2,
        chapters: [
          { name: 'English (Grammar & Comprehension)', order_index: 1, estimated_hours: 15 },
          { name: 'General Science (Physics/Chem/Bio)', order_index: 2, estimated_hours: 20 },
          { name: 'History, Freedom Movement & Geography', order_index: 3, estimated_hours: 20 },
          { name: 'Current Events', order_index: 4, estimated_hours: 15 },
        ],
      },
    ],
  },
  {
    id: 'clat-seed',
    name: 'CLAT (Law Entrance)',
    slug: 'clat',
    category: 'student',
    exam_type: 'entrance',
    popularity_score: 840,
    description: 'Common Law Admission Test for NLUs',
    color: '#EF4444',
    icon_name: 'scale',
    subjects: [
      {
        name: 'Legal Reasoning',
        code: 'LEGAL',
        color: '#EF4444',
        order_index: 1,
        chapters: [
          { name: 'Constitutional Law Passages', order_index: 1, estimated_hours: 15 },
          { name: 'Torts, Criminal & Contract Law', order_index: 2, estimated_hours: 20 },
        ],
      },
      {
        name: 'Current Affairs & GK',
        code: 'GK',
        color: '#F59E0B',
        order_index: 2,
        chapters: [
          { name: 'National & International Law Events', order_index: 1, estimated_hours: 20 },
        ],
      },
      {
        name: 'Logical Reasoning',
        code: 'LR',
        color: '#8B5CF6',
        order_index: 3,
        chapters: [
          { name: 'Critical Reasoning & Arguments', order_index: 1, estimated_hours: 18 },
        ],
      },
    ],
  },
  {
    id: 'cs-foundation-seed',
    name: 'CS Foundation',
    slug: 'cs-foundation',
    category: 'student',
    exam_type: 'professional',
    popularity_score: 800,
    description: 'ICSI Company Secretary Foundation Course',
    color: '#7C2D12',
    icon_name: 'file-text',
    subjects: [
      {
        name: 'Business Environment & Law',
        code: 'BEL',
        color: '#4F46E5',
        order_index: 1,
        chapters: [{ name: 'Business Law Concepts', order_index: 1, estimated_hours: 18 }],
      },
      {
        name: 'Business Management & Ethics',
        code: 'BME',
        color: '#059669',
        order_index: 2,
        chapters: [{ name: 'Management Principles & Ethics', order_index: 1, estimated_hours: 15 }],
      },
      {
        name: 'Business Economics',
        code: 'BECO',
        color: '#D97706',
        order_index: 3,
        chapters: [{ name: 'Economics & Statistics', order_index: 1, estimated_hours: 15 }],
      },
      {
        name: 'Fundamentals of Accounting',
        code: 'ACC',
        color: '#2563EB',
        order_index: 4,
        chapters: [{ name: 'Accounting & Auditing', order_index: 1, estimated_hours: 18 }],
      },
    ],
  },
  {
    id: 'rrb-ntpc-seed',
    name: 'RRB NTPC & Group D (Railways)',
    slug: 'rrb-ntpc',
    category: 'student',
    exam_type: 'sarkari',
    popularity_score: 950,
    description: 'Railway Recruitment Board Non-Technical Popular Categories & Group D',
    color: '#DC2626',
    icon_name: 'train',
    subjects: [
      {
        name: 'Mathematics',
        code: 'MATH',
        color: '#2563EB',
        order_index: 1,
        chapters: [
          { name: 'Number System, Decimals & Fractions', order_index: 1, estimated_hours: 10 },
          { name: 'LCM, HCF & Simplification', order_index: 2, estimated_hours: 8 },
          { name: 'Ratio, Proportion & Percentage', order_index: 3, estimated_hours: 12 },
          { name: 'Time & Work, Pipes & Cisterns', order_index: 4, estimated_hours: 12 },
          { name: 'Time, Speed & Distance, Trains', order_index: 5, estimated_hours: 12 },
          { name: 'Simple & Compound Interest', order_index: 6, estimated_hours: 10 },
          { name: 'Profit, Loss & Discount', order_index: 7, estimated_hours: 10 },
          { name: 'Algebra, Geometry & Trigonometry', order_index: 8, estimated_hours: 15 },
          { name: 'Mensuration (2D & 3D)', order_index: 9, estimated_hours: 12 },
          { name: 'Elementary Statistics & Data Interpretation', order_index: 10, estimated_hours: 10 },
        ],
      },
      {
        name: 'General Intelligence & Reasoning',
        code: 'REAS',
        color: '#8B5CF6',
        order_index: 2,
        chapters: [
          { name: 'Analogies & Alphabetical Series', order_index: 1, estimated_hours: 8 },
          { name: 'Coding-Decoding & Blood Relations', order_index: 2, estimated_hours: 10 },
          { name: 'Mathematical Operations & Syllogism', order_index: 3, estimated_hours: 8 },
          { name: 'Venn Diagram, Puzzles & Data Sufficiency', order_index: 4, estimated_hours: 12 },
          { name: 'Statement-Conclusions & Decision Making', order_index: 5, estimated_hours: 8 },
          { name: 'Non-Verbal & Direction Sense', order_index: 6, estimated_hours: 8 },
        ],
      },
      {
        name: 'General Awareness',
        code: 'GA',
        color: '#F59E0B',
        order_index: 3,
        chapters: [
          { name: 'Current Events of National & International Importance', order_index: 1, estimated_hours: 20 },
          { name: 'General Science (Physics, Chemistry, Life Sciences up to 10th CBSE)', order_index: 2, estimated_hours: 25 },
          { name: 'History of India & Freedom Struggle', order_index: 3, estimated_hours: 15 },
          { name: 'Indian Geography & Environment', order_index: 4, estimated_hours: 15 },
          { name: 'Indian Polity & Governance', order_index: 5, estimated_hours: 15 },
          { name: 'Indian Economy & General Scientific Knowledge', order_index: 6, estimated_hours: 12 },
        ],
      },
    ],
  },
  {
    id: 'ssc-chsl-seed',
    name: 'SSC CHSL & MTS',
    slug: 'ssc-chsl',
    category: 'student',
    exam_type: 'sarkari',
    popularity_score: 935,
    description: 'Staff Selection Commission 10+2 CHSL & Multi-Tasking Staff Exam',
    color: '#059669',
    icon_name: 'shield',
    subjects: [
      {
        name: 'Quantitative Aptitude',
        code: 'QA',
        color: '#2563EB',
        order_index: 1,
        chapters: [
          { name: 'Number Systems & Arithmetic Basics', order_index: 1, estimated_hours: 15 },
          { name: 'Percentage, Profit-Loss & Interest', order_index: 2, estimated_hours: 15 },
          { name: 'Time-Work, Speed-Time-Distance', order_index: 3, estimated_hours: 12 },
          { name: 'Basic Algebra & Geometry', order_index: 4, estimated_hours: 14 },
          { name: 'Mensuration & Data Interpretation', order_index: 5, estimated_hours: 12 },
        ],
      },
      {
        name: 'Reasoning Ability',
        code: 'REAS',
        color: '#8B5CF6',
        order_index: 2,
        chapters: [
          { name: 'Semantic & Symbolic Analogies', order_index: 1, estimated_hours: 8 },
          { name: 'Number Series & Coding-Decoding', order_index: 2, estimated_hours: 8 },
          { name: 'Venn Diagrams & Blood Relations', order_index: 3, estimated_hours: 8 },
          { name: 'Paper Folding, Mirror Images & Non-Verbal', order_index: 4, estimated_hours: 10 },
        ],
      },
      {
        name: 'English Comprehension',
        code: 'ENG',
        color: '#EC4899',
        order_index: 3,
        chapters: [
          { name: 'Spotting Errors & Sentence Improvement', order_index: 1, estimated_hours: 12 },
          { name: 'Synonyms, Antonyms & One Word Substitution', order_index: 2, estimated_hours: 15 },
          { name: 'Idioms, Phrases & Cloze Test', order_index: 3, estimated_hours: 12 },
          { name: 'Reading Comprehension', order_index: 4, estimated_hours: 10 },
        ],
      },
      {
        name: 'General Awareness',
        code: 'GA',
        color: '#F59E0B',
        order_index: 4,
        chapters: [
          { name: 'History, Culture & Freedom Movement', order_index: 1, estimated_hours: 14 },
          { name: 'Geography & Environment', order_index: 2, estimated_hours: 12 },
          { name: 'Indian Polity & Constitution', order_index: 3, estimated_hours: 12 },
          { name: 'General Science & Daily Current Affairs', order_index: 4, estimated_hours: 18 },
        ],
      },
    ],
  },
  {
    id: 'cds-seed',
    name: 'CDS (Combined Defence Services)',
    slug: 'cds',
    category: 'student',
    exam_type: 'sarkari',
    popularity_score: 915,
    description: 'UPSC Combined Defence Services Examination for Army, Navy & Air Force Officers',
    color: '#D97706',
    icon_name: 'shield-check',
    subjects: [
      {
        name: 'Mathematics',
        code: 'MATH',
        color: '#2563EB',
        order_index: 1,
        chapters: [
          { name: 'Arithmetic & Number Theory', order_index: 1, estimated_hours: 15 },
          { name: 'Algebra & Quadratic Equations', order_index: 2, estimated_hours: 12 },
          { name: 'Trigonometry & Heights/Distances', order_index: 3, estimated_hours: 14 },
          { name: 'Geometry (Lines, Angles, Triangles, Circles)', order_index: 4, estimated_hours: 18 },
          { name: 'Mensuration (Areas & Volumes)', order_index: 5, estimated_hours: 14 },
          { name: 'Statistics & Frequency Distributions', order_index: 6, estimated_hours: 8 },
        ],
      },
      {
        name: 'English Comprehension',
        code: 'ENG',
        color: '#EC4899',
        order_index: 2,
        chapters: [
          { name: 'Spotting Errors & Sentence Completion', order_index: 1, estimated_hours: 12 },
          { name: 'Ordering of Words & Sentences', order_index: 2, estimated_hours: 10 },
          { name: 'Synonyms & Antonyms', order_index: 3, estimated_hours: 12 },
          { name: 'Reading Comprehension Passages', order_index: 4, estimated_hours: 12 },
        ],
      },
      {
        name: 'General Awareness',
        code: 'GA',
        color: '#F59E0B',
        order_index: 3,
        chapters: [
          { name: 'Physics & Chemistry (Everyday Science)', order_index: 1, estimated_hours: 15 },
          { name: 'Biology & Health Sciences', order_index: 2, estimated_hours: 12 },
          { name: 'Indian History & Modern Movement', order_index: 3, estimated_hours: 15 },
          { name: 'Geography of India & the World', order_index: 4, estimated_hours: 14 },
          { name: 'Indian Polity, Defence News & Current Affairs', order_index: 5, estimated_hours: 18 },
        ],
      },
    ],
  },
  {
    id: 'state-pcs-seed',
    name: 'State PCS (BPSC / UPPSC / MPPSC)',
    slug: 'state-pcs',
    category: 'student',
    exam_type: 'sarkari',
    popularity_score: 925,
    description: 'State Public Service Commission Civil Services Examination',
    color: '#7C3AED',
    icon_name: 'landmark',
    subjects: [
      {
        name: 'General Studies 1',
        code: 'GS1',
        color: '#8B5CF6',
        order_index: 1,
        chapters: [
          { name: 'History of India & National Movement', order_index: 1, estimated_hours: 20 },
          { name: 'Art, Culture & Heritage', order_index: 2, estimated_hours: 12 },
          { name: 'Indian & World Geography', order_index: 3, estimated_hours: 18 },
          { name: 'State Specific History, Geography & Culture', order_index: 4, estimated_hours: 25 },
        ],
      },
      {
        name: 'General Studies 2',
        code: 'GS2',
        color: '#3B82F6',
        order_index: 2,
        chapters: [
          { name: 'Indian Constitution & Political System', order_index: 1, estimated_hours: 20 },
          { name: 'Panchayati Raj & Public Policy', order_index: 2, estimated_hours: 12 },
          { name: 'State Administrative Structure', order_index: 3, estimated_hours: 12 },
        ],
      },
      {
        name: 'General Studies 3',
        code: 'GS3',
        color: '#10B981',
        order_index: 3,
        chapters: [
          { name: 'Indian Economy & State Budget/Economy', order_index: 1, estimated_hours: 18 },
          { name: 'General Science & Tech in Development', order_index: 2, estimated_hours: 15 },
          { name: 'Environment, Ecology & Disaster Management', order_index: 3, estimated_hours: 14 },
        ],
      },
      {
        name: 'CSAT & Aptitude',
        code: 'CSAT',
        color: '#F59E0B',
        order_index: 4,
        chapters: [
          { name: 'Reading Comprehension & Interpersonal Skills', order_index: 1, estimated_hours: 12 },
          { name: 'Logical Reasoning & Analytical Ability', order_index: 2, estimated_hours: 14 },
          { name: 'Basic Numeracy & Data Interpretation', order_index: 3, estimated_hours: 15 },
        ],
      },
    ],
  },
  {
    "id": "rrb-alp-seed",
  "name": "RRB ALP (Assistant Loco Pilot)",
  "slug": "rrb-alp",
  "category": "student",
  "exam_type": "sarkari",
  "popularity_score": 950,
  "description": "Railway Recruitment Board Assistant Loco Pilot (CBT 1 & CBT 2)",
  "color": "#EA580C",
  "icon_name": "train",
  "subjects": [
    {
      "name": "Mathematics",
      "code": "MATH",
      "color": "#3B82F6",
      "order_index": 1,
      "chapters": [
        {
          "name": "Number System & BODMAS",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Fractions, Decimals & LCM-HCF",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Ratio, Proportion & Percentage",
          "order_index": 3,
          "estimated_hours": 8
        },
        {
          "name": "Mensuration (2D & 3D)",
          "order_index": 4,
          "estimated_hours": 10
        },
        {
          "name": "Time & Work, Pipes & Cisterns",
          "order_index": 5,
          "estimated_hours": 8
        },
        {
          "name": "Time, Speed & Distance",
          "order_index": 6,
          "estimated_hours": 8
        },
        {
          "name": "Simple & Compound Interest",
          "order_index": 7,
          "estimated_hours": 6
        },
        {
          "name": "Profit, Loss & Discount",
          "order_index": 8,
          "estimated_hours": 6
        },
        {
          "name": "Algebra, Linear & Quadratic Equations",
          "order_index": 9,
          "estimated_hours": 8
        },
        {
          "name": "Geometry & Trigonometry",
          "order_index": 10,
          "estimated_hours": 10
        },
        {
          "name": "Elementary Statistics & Age Problems",
          "order_index": 11,
          "estimated_hours": 6
        }
      ]
    },
    {
      "name": "General Intelligence & Reasoning",
      "code": "REAS",
      "color": "#8B5CF6",
      "order_index": 2,
      "chapters": [
        {
          "name": "Analogies & Number/Alphabet Series",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Coding-Decoding & Blood Relations",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Mathematical Operations & Syllogism",
          "order_index": 3,
          "estimated_hours": 6
        },
        {
          "name": "Venn Diagrams & Data Sufficiency",
          "order_index": 4,
          "estimated_hours": 6
        },
        {
          "name": "Direction Sense & Ranking Tests",
          "order_index": 5,
          "estimated_hours": 6
        },
        {
          "name": "Statements, Conclusions & Decisions",
          "order_index": 6,
          "estimated_hours": 6
        },
        {
          "name": "Analytical & Non-Verbal Reasoning",
          "order_index": 7,
          "estimated_hours": 8
        }
      ]
    },
    {
      "name": "Basic Science & Engineering",
      "code": "BSE_ALP",
      "color": "#10B981",
      "order_index": 3,
      "chapters": [
        {
          "name": "Engineering Drawing (Views, Projections & Instruments)",
          "order_index": 1,
          "estimated_hours": 10
        },
        {
          "name": "Units, Measurements & Dimensions",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Mass, Weight & Density",
          "order_index": 3,
          "estimated_hours": 6
        },
        {
          "name": "Work, Power & Energy",
          "order_index": 4,
          "estimated_hours": 8
        },
        {
          "name": "Speed, Velocity & Acceleration",
          "order_index": 5,
          "estimated_hours": 8
        },
        {
          "name": "Heat, Temperature & Thermal Expansion",
          "order_index": 6,
          "estimated_hours": 8
        },
        {
          "name": "Basic Electricity & Circuits",
          "order_index": 7,
          "estimated_hours": 10
        },
        {
          "name": "Levers, Pulleys & Simple Machines",
          "order_index": 8,
          "estimated_hours": 8
        },
        {
          "name": "Occupational Health & Safety Protocols",
          "order_index": 9,
          "estimated_hours": 6
        },
        {
          "name": "Environment Education & IT Literacy",
          "order_index": 10,
          "estimated_hours": 6
        }
      ]
    },
    {
      "name": "General Awareness & Current Affairs",
      "code": "GA_CA",
      "color": "#F59E0B",
      "order_index": 4,
      "chapters": [
        {
          "name": "Science & Technology Innovations",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Indian Railways Network & History",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Sports, Awards & Major Personalities",
          "order_index": 3,
          "estimated_hours": 6
        },
        {
          "name": "Current Events (National & Global)",
          "order_index": 4,
          "estimated_hours": 8
        },
        {
          "name": "Indian Polity & Economic Fundamentals",
          "order_index": 5,
          "estimated_hours": 8
        }
      ]
    },
    {
      "name": "Technical Trade Theory (Part B Qualifying)",
      "code": "TRADE_TH",
      "color": "#EC4899",
      "order_index": 5,
      "chapters": [
        {
          "name": "Electrical & Wireman Fundamentals",
          "order_index": 1,
          "estimated_hours": 10
        },
        {
          "name": "Fitter, Turner & Machinist Trade Theory",
          "order_index": 2,
          "estimated_hours": 10
        },
        {
          "name": "Diesel Mechanic & Automobile Systems",
          "order_index": 3,
          "estimated_hours": 10
        },
        {
          "name": "Electronic Mechanics & Instruments",
          "order_index": 4,
          "estimated_hours": 10
        }
      ]
    }
  ]
},
{
  "id": "rrb-technician-seed",
  "name": "RRB Technician (Grade 1 & 3)",
  "slug": "rrb-technician",
  "category": "student",
  "exam_type": "sarkari",
  "popularity_score": 945,
  "description": "Signal, Telecommunication & Workshop Technicians Recruitment",
  "color": "#0284C7",
  "icon_name": "tool",
  "subjects": [
    {
      "name": "Mathematics",
      "code": "MATH",
      "color": "#3B82F6",
      "order_index": 1,
      "chapters": [
        {
          "name": "Number System & Simplification",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Percentages, Ratio & Proportion",
          "order_index": 2,
          "estimated_hours": 8
        },
        {
          "name": "Profit, Loss, Discount & Interest",
          "order_index": 3,
          "estimated_hours": 8
        },
        {
          "name": "Time & Work, Time, Speed & Distance",
          "order_index": 4,
          "estimated_hours": 8
        },
        {
          "name": "Algebra & Coordinate Geometry",
          "order_index": 5,
          "estimated_hours": 10
        },
        {
          "name": "Trigonometry, Heights & Distances",
          "order_index": 6,
          "estimated_hours": 10
        },
        {
          "name": "Mensuration & Surface Areas",
          "order_index": 7,
          "estimated_hours": 8
        },
        {
          "name": "Statistics & Probability",
          "order_index": 8,
          "estimated_hours": 6
        }
      ]
    },
    {
      "name": "General Intelligence & Reasoning",
      "code": "REAS",
      "color": "#8B5CF6",
      "order_index": 2,
      "chapters": [
        {
          "name": "Verbal & Number Series",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Coding-Decoding & Cryptography",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Puzzles & Seating Arrangements",
          "order_index": 3,
          "estimated_hours": 8
        },
        {
          "name": "Venn Diagrams & Syllogisms",
          "order_index": 4,
          "estimated_hours": 6
        },
        {
          "name": "Analytical Reasoning & Blood Relations",
          "order_index": 5,
          "estimated_hours": 6
        },
        {
          "name": "Non-Verbal Pattern Completion",
          "order_index": 6,
          "estimated_hours": 6
        }
      ]
    },
    {
      "name": "Basics of Computers & Applications",
      "code": "COMP_APP",
      "color": "#6366F1",
      "order_index": 3,
      "chapters": [
        {
          "name": "Computer Architecture & Hardware",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Operating Systems (Windows, Linux basics)",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "MS Office (Word, Excel, PowerPoint)",
          "order_index": 3,
          "estimated_hours": 6
        },
        {
          "name": "Data Representation & Binary Systems",
          "order_index": 4,
          "estimated_hours": 6
        },
        {
          "name": "Networking, LAN, WAN & Internet Protocols",
          "order_index": 5,
          "estimated_hours": 8
        },
        {
          "name": "Cyber Security & Malware Protection",
          "order_index": 6,
          "estimated_hours": 6
        }
      ]
    },
    {
      "name": "Basic Science & Engineering Physics",
      "code": "PHYS_TECH",
      "color": "#10B981",
      "order_index": 4,
      "chapters": [
        {
          "name": "Units, Dimensions & Error Analysis",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Mechanics, Forces & Laws of Motion",
          "order_index": 2,
          "estimated_hours": 8
        },
        {
          "name": "Work, Power, Energy & Friction",
          "order_index": 3,
          "estimated_hours": 8
        },
        {
          "name": "Heat, Thermodynamics & Waves",
          "order_index": 4,
          "estimated_hours": 8
        },
        {
          "name": "Optics, Sound & Wave Motion",
          "order_index": 5,
          "estimated_hours": 8
        },
        {
          "name": "Electrostatics, Current Electricity & Magnetism",
          "order_index": 6,
          "estimated_hours": 10
        },
        {
          "name": "Basic Electronics, Diodes & Transistors",
          "order_index": 7,
          "estimated_hours": 10
        }
      ]
    },
    {
      "name": "General Awareness",
      "code": "GA",
      "color": "#F59E0B",
      "order_index": 5,
      "chapters": [
        {
          "name": "National & International Affairs",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Indian Geography & Infrastructure",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Constitution, Polity & Governance",
          "order_index": 3,
          "estimated_hours": 6
        },
        {
          "name": "Environmental Science & Ecology",
          "order_index": 4,
          "estimated_hours": 6
        }
      ]
    }
  ]
},
{
  "id": "rrb-je-seed",
  "name": "RRB JE (Junior Engineer)",
  "slug": "rrb-je",
  "category": "student",
  "exam_type": "sarkari",
  "popularity_score": 940,
  "description": "Civil, Mechanical, Electrical, Electronics & IT Junior Engineers",
  "color": "#2563EB",
  "icon_name": "cpu",
  "subjects": [
    {
      "name": "Mathematics",
      "code": "MATH",
      "color": "#3B82F6",
      "order_index": 1,
      "chapters": [
        {
          "name": "Number Systems, Polynomials & Algebra",
          "order_index": 1,
          "estimated_hours": 8
        },
        {
          "name": "Ratio, Proportion, Percentage & Average",
          "order_index": 2,
          "estimated_hours": 8
        },
        {
          "name": "Time & Work, Time & Distance, SI & CI",
          "order_index": 3,
          "estimated_hours": 8
        },
        {
          "name": "Geometry, Mensuration & Trigonometry",
          "order_index": 4,
          "estimated_hours": 10
        },
        {
          "name": "Coordinate Geometry & Vectors",
          "order_index": 5,
          "estimated_hours": 8
        },
        {
          "name": "Differential Calculus & Integrals Basics",
          "order_index": 6,
          "estimated_hours": 10
        },
        {
          "name": "Statistics, Mean, Median & Probability",
          "order_index": 7,
          "estimated_hours": 6
        }
      ]
    },
    {
      "name": "General Intelligence & Reasoning",
      "code": "REAS",
      "color": "#8B5CF6",
      "order_index": 2,
      "chapters": [
        {
          "name": "Syllogisms, Analogies & Series",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Blood Relations, Directions & Puzzles",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Data Interpretation & Venn Diagrams",
          "order_index": 3,
          "estimated_hours": 6
        },
        {
          "name": "Critical Reasoning & Decision Making",
          "order_index": 4,
          "estimated_hours": 6
        },
        {
          "name": "Spatial Visualization & Pattern Matching",
          "order_index": 5,
          "estimated_hours": 6
        }
      ]
    },
    {
      "name": "General Science (Physics & Chemistry up to 10th)",
      "code": "SCI_JE",
      "color": "#10B981",
      "order_index": 3,
      "chapters": [
        {
          "name": "Kinematics, Dynamics & Gravitation",
          "order_index": 1,
          "estimated_hours": 8
        },
        {
          "name": "Fluids, Surface Tension & Viscosity",
          "order_index": 2,
          "estimated_hours": 8
        },
        {
          "name": "Heat, Sound & Wave Motion",
          "order_index": 3,
          "estimated_hours": 8
        },
        {
          "name": "Current Electricity, Magnetic Effects & Induction",
          "order_index": 4,
          "estimated_hours": 10
        },
        {
          "name": "Chemical Reactions, Acids, Bases & Salts",
          "order_index": 5,
          "estimated_hours": 8
        },
        {
          "name": "Periodic Classification & Metals-Nonmetals",
          "order_index": 6,
          "estimated_hours": 8
        },
        {
          "name": "Organic Carbon Compounds & Everyday Chemistry",
          "order_index": 7,
          "estimated_hours": 8
        }
      ]
    },
    {
      "name": "Basics of Computers & Applications",
      "code": "COMP_APP",
      "color": "#6366F1",
      "order_index": 4,
      "chapters": [
        {
          "name": "Architecture, CPU, Input/Output & Memory",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Operating Systems & File Management",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Algorithms, Flowcharts & Data Representation",
          "order_index": 3,
          "estimated_hours": 6
        },
        {
          "name": "Networks, Internet, Email & Web Browsers",
          "order_index": 4,
          "estimated_hours": 6
        }
      ]
    },
    {
      "name": "Environment & Pollution Control",
      "code": "ENV_POLL",
      "color": "#059669",
      "order_index": 5,
      "chapters": [
        {
          "name": "Ecosystem & Biodiversity Conservation",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Air & Water Pollution Control Standards",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Noise & Solid Waste Management",
          "order_index": 3,
          "estimated_hours": 6
        },
        {
          "name": "Global Warming, Climate Change & Ozone Layer",
          "order_index": 4,
          "estimated_hours": 6
        },
        {
          "name": "Environmental Protection Acts & Treatment",
          "order_index": 5,
          "estimated_hours": 6
        }
      ]
    },
    {
      "name": "Technical Engineering Core",
      "code": "TECH_CORE",
      "color": "#DC2626",
      "order_index": 6,
      "chapters": [
        {
          "name": "Engineering Mechanics & Strength of Materials",
          "order_index": 1,
          "estimated_hours": 12
        },
        {
          "name": "Fluid Mechanics & Hydraulic Machines",
          "order_index": 2,
          "estimated_hours": 10
        },
        {
          "name": "Electrical Circuits, Machines & Measurements",
          "order_index": 3,
          "estimated_hours": 12
        },
        {
          "name": "Electronic Devices, Digital Circuits & Microprocessors",
          "order_index": 4,
          "estimated_hours": 12
        },
        {
          "name": "Building Materials, Surveying & Concrete Tech",
          "order_index": 5,
          "estimated_hours": 12
        }
      ]
    }
  ]
},
{
  "id": "rpf-constable-seed",
  "name": "RPF Constable",
  "slug": "rpf-constable",
  "category": "student",
  "exam_type": "sarkari",
  "popularity_score": 935,
  "description": "Railway Protection Force Constable Recruitment (120 Marks CBT)",
  "color": "#B45309",
  "icon_name": "shield",
  "subjects": [
    {
      "name": "General Awareness",
      "code": "GA",
      "color": "#F59E0B",
      "order_index": 1,
      "chapters": [
        {
          "name": "Indian Freedom Struggle & Modern History",
          "order_index": 1,
          "estimated_hours": 8
        },
        {
          "name": "Indian Art, Culture & Heritage",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Indian & World Geography",
          "order_index": 3,
          "estimated_hours": 8
        },
        {
          "name": "Indian Polity & Constitution of India",
          "order_index": 4,
          "estimated_hours": 8
        },
        {
          "name": "General Science (Physics, Chemistry, Life Sciences)",
          "order_index": 5,
          "estimated_hours": 10
        },
        {
          "name": "Current Affairs (National & International)",
          "order_index": 6,
          "estimated_hours": 8
        },
        {
          "name": "Sports, Cups, Trophies & Personalities",
          "order_index": 7,
          "estimated_hours": 6
        },
        {
          "name": "Railway Knowledge & Security Protocol",
          "order_index": 8,
          "estimated_hours": 6
        }
      ]
    },
    {
      "name": "Arithmetic",
      "code": "ARITH",
      "color": "#3B82F6",
      "order_index": 2,
      "chapters": [
        {
          "name": "Number Systems & Whole Numbers",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Decimals, Fractions & BODMAS",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Percentages, Ratio & Proportion",
          "order_index": 3,
          "estimated_hours": 8
        },
        {
          "name": "Averages & Age Problems",
          "order_index": 4,
          "estimated_hours": 6
        },
        {
          "name": "Profit, Loss & Discount",
          "order_index": 5,
          "estimated_hours": 6
        },
        {
          "name": "Simple & Compound Interest",
          "order_index": 6,
          "estimated_hours": 6
        },
        {
          "name": "Time & Work, Pipes & Cisterns",
          "order_index": 7,
          "estimated_hours": 8
        },
        {
          "name": "Time, Speed & Distance",
          "order_index": 8,
          "estimated_hours": 8
        },
        {
          "name": "Mensuration (Perimeter, Area & Volume)",
          "order_index": 9,
          "estimated_hours": 8
        }
      ]
    },
    {
      "name": "General Intelligence & Reasoning",
      "code": "REAS",
      "color": "#8B5CF6",
      "order_index": 3,
      "chapters": [
        {
          "name": "Analogies & Similarities",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Spatial Orientation & Visual Memory",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Coding-Decoding & Odd One Out",
          "order_index": 3,
          "estimated_hours": 6
        },
        {
          "name": "Blood Relations & Family Tree",
          "order_index": 4,
          "estimated_hours": 6
        },
        {
          "name": "Direction & Distance Tests",
          "order_index": 5,
          "estimated_hours": 6
        },
        {
          "name": "Number & Letter Series",
          "order_index": 6,
          "estimated_hours": 6
        },
        {
          "name": "Syllogisms & Venn Diagrams",
          "order_index": 7,
          "estimated_hours": 6
        },
        {
          "name": "Non-Verbal Pattern & Mirror Images",
          "order_index": 8,
          "estimated_hours": 6
        }
      ]
    }
  ]
},
{
  "id": "rpf-si-seed",
  "name": "RPF Sub-Inspector (SI)",
  "slug": "rpf-si",
  "category": "student",
  "exam_type": "sarkari",
  "popularity_score": 930,
  "description": "Railway Protection Force Sub-Inspector Recruitment (Graduate Level)",
  "color": "#7C3AED",
  "icon_name": "award",
  "subjects": [
    {
      "name": "General Awareness",
      "code": "GA",
      "color": "#F59E0B",
      "order_index": 1,
      "chapters": [
        {
          "name": "Ancient, Medieval & Modern Indian History",
          "order_index": 1,
          "estimated_hours": 10
        },
        {
          "name": "Indian National Movement & Freedom Struggle",
          "order_index": 2,
          "estimated_hours": 8
        },
        {
          "name": "Physical, Social & Economic Geography of India",
          "order_index": 3,
          "estimated_hours": 8
        },
        {
          "name": "Indian Constitution, Fundamental Rights & Duties",
          "order_index": 4,
          "estimated_hours": 10
        },
        {
          "name": "Executive, Judiciary & Parliamentary Procedures",
          "order_index": 5,
          "estimated_hours": 8
        },
        {
          "name": "Indian Economy, Banking & Budgetary Concepts",
          "order_index": 6,
          "estimated_hours": 8
        },
        {
          "name": "General Science & Scientific Innovations",
          "order_index": 7,
          "estimated_hours": 10
        },
        {
          "name": "Global Treaties, National Defense & Security",
          "order_index": 8,
          "estimated_hours": 6
        },
        {
          "name": "Current Affairs, Awards & Sports Records",
          "order_index": 9,
          "estimated_hours": 8
        }
      ]
    },
    {
      "name": "Arithmetic & Quantitative Aptitude",
      "code": "QA",
      "color": "#3B82F6",
      "order_index": 2,
      "chapters": [
        {
          "name": "Advanced Number Systems & Factors",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Percentages, Profit, Loss & Discount",
          "order_index": 2,
          "estimated_hours": 8
        },
        {
          "name": "Ratio, Proportion & Mixtures-Alligations",
          "order_index": 3,
          "estimated_hours": 8
        },
        {
          "name": "Simple & Compound Interest (Installments)",
          "order_index": 4,
          "estimated_hours": 8
        },
        {
          "name": "Time & Work, Efficiency & Wages",
          "order_index": 5,
          "estimated_hours": 8
        },
        {
          "name": "Time, Speed, Distance, Trains & Boats",
          "order_index": 6,
          "estimated_hours": 8
        },
        {
          "name": "Mensuration (2D Geometric Figures & 3D Solids)",
          "order_index": 7,
          "estimated_hours": 10
        },
        {
          "name": "Data Interpretation (Tables, Bar & Pie Charts)",
          "order_index": 8,
          "estimated_hours": 8
        }
      ]
    },
    {
      "name": "General Intelligence & Logical Reasoning",
      "code": "LR",
      "color": "#8B5CF6",
      "order_index": 3,
      "chapters": [
        {
          "name": "Syllogistic Deductions & Venn Diagrams",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Seating Arrangements (Circular, Linear & Floor)",
          "order_index": 2,
          "estimated_hours": 8
        },
        {
          "name": "Complex Puzzles & Tabulation",
          "order_index": 3,
          "estimated_hours": 8
        },
        {
          "name": "Direction Sense & Distance Calculations",
          "order_index": 4,
          "estimated_hours": 6
        },
        {
          "name": "Blood Relations & Coded Hierarchy",
          "order_index": 5,
          "estimated_hours": 6
        },
        {
          "name": "Statement & Assumptions, Arguments & Conclusions",
          "order_index": 6,
          "estimated_hours": 6
        },
        {
          "name": "Critical & Analytical Decision Making",
          "order_index": 7,
          "estimated_hours": 6
        },
        {
          "name": "Non-Verbal Reasoning, Cubes & Dices",
          "order_index": 8,
          "estimated_hours": 6
        }
      ]
    }
  ]
},
{
  "id": "rrb-ministerial-seed",
  "name": "RRB Ministerial & Isolated Categories",
  "slug": "rrb-ministerial",
  "category": "student",
  "exam_type": "sarkari",
  "popularity_score": 895,
  "description": "Junior Stenographer, Translator, Welfare Inspector & Law Assistant",
  "color": "#0D9488",
  "icon_name": "briefcase",
  "subjects": [
    {
      "name": "Professional Ability",
      "code": "PROF_MIN",
      "color": "#6366F1",
      "order_index": 1,
      "chapters": [
        {
          "name": "Office Management & Secretarial Practice",
          "order_index": 1,
          "estimated_hours": 10
        },
        {
          "name": "Official Language Rules (Rajbhasha Adhiniyam)",
          "order_index": 2,
          "estimated_hours": 8
        },
        {
          "name": "Industrial & Labour Laws, Welfare Provisions",
          "order_index": 3,
          "estimated_hours": 10
        },
        {
          "name": "Right to Information (RTI Act) & Conduct Rules",
          "order_index": 4,
          "estimated_hours": 8
        },
        {
          "name": "Shorthand, Transcription & Hindi/English Grammar",
          "order_index": 5,
          "estimated_hours": 10
        }
      ]
    },
    {
      "name": "General Awareness",
      "code": "GA",
      "color": "#F59E0B",
      "order_index": 2,
      "chapters": [
        {
          "name": "Indian Constitution, Polity & Governance",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Current Affairs (National & International)",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Indian History, Freedom Struggle & Geography",
          "order_index": 3,
          "estimated_hours": 8
        },
        {
          "name": "Everyday Science & Technology Developments",
          "order_index": 4,
          "estimated_hours": 6
        }
      ]
    },
    {
      "name": "General Intelligence & Reasoning",
      "code": "REAS",
      "color": "#8B5CF6",
      "order_index": 3,
      "chapters": [
        {
          "name": "Analogies, Alphabet & Number Series",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Coding-Decoding & Blood Relations",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Logical Deduction, Syllogisms & Venn Diagrams",
          "order_index": 3,
          "estimated_hours": 6
        },
        {
          "name": "Direction Sense & Analytical Reasoning",
          "order_index": 4,
          "estimated_hours": 6
        }
      ]
    },
    {
      "name": "Mathematics",
      "code": "MATH",
      "color": "#3B82F6",
      "order_index": 4,
      "chapters": [
        {
          "name": "Number Systems, Decimals & Fractions",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Percentages, Ratio, Proportion & Averages",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Profit, Loss, SI & CI",
          "order_index": 3,
          "estimated_hours": 6
        },
        {
          "name": "Time & Work, Time & Distance",
          "order_index": 4,
          "estimated_hours": 6
        }
      ]
    },
    {
      "name": "General Science",
      "code": "GEN_SCI",
      "color": "#10B981",
      "order_index": 5,
      "chapters": [
        {
          "name": "Physics (Mechanics, Optics, Electricity)",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Chemistry (Matter, Solutions, Chemical Equations)",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Biology (Human Physiology, Health & Diseases)",
          "order_index": 3,
          "estimated_hours": 6
        }
      ]
    }
  ]
},
{
  "id": "rrb-paramedical-seed",
  "name": "RRB Paramedical Categories",
  "slug": "rrb-paramedical",
  "category": "student",
  "exam_type": "sarkari",
  "popularity_score": 890,
  "description": "Staff Nurse, Pharmacist, Lab Technician & Radiographer Recruitment",
  "color": "#E11D48",
  "icon_name": "activity",
  "subjects": [
    {
      "name": "Professional Ability (Medical & Healthcare)",
      "code": "PROF_PARAMED",
      "color": "#E11D48",
      "order_index": 1,
      "chapters": [
        {
          "name": "Human Anatomy, Physiology & Pathology",
          "order_index": 1,
          "estimated_hours": 12
        },
        {
          "name": "Microbiology, Infection Control & Immunology",
          "order_index": 2,
          "estimated_hours": 10
        },
        {
          "name": "Pharmacology, Dosage Forms & Drug Actions",
          "order_index": 3,
          "estimated_hours": 12
        },
        {
          "name": "Medical-Surgical Nursing & Patient Care",
          "order_index": 4,
          "estimated_hours": 12
        },
        {
          "name": "Biochemistry, Hematology & Clinical Pathology",
          "order_index": 5,
          "estimated_hours": 10
        },
        {
          "name": "Community Health, First Aid & Hospital Protocols",
          "order_index": 6,
          "estimated_hours": 8
        }
      ]
    },
    {
      "name": "General Science",
      "code": "GEN_SCI",
      "color": "#10B981",
      "order_index": 2,
      "chapters": [
        {
          "name": "Cell Biology, Genetics & Human Systems",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Basic Physics (Light, Sound, Radiation Safety)",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Basic Chemistry (Solutions, Acids-Bases, Drugs)",
          "order_index": 3,
          "estimated_hours": 6
        }
      ]
    },
    {
      "name": "General Arithmetic & Reasoning",
      "code": "ARITH_REAS",
      "color": "#3B82F6",
      "order_index": 3,
      "chapters": [
        {
          "name": "Basic Arithmetic, Percentages & Ratios",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Numerical Series, Analogies & Coding",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Direction Sense, Family Relations & Logic",
          "order_index": 3,
          "estimated_hours": 6
        }
      ]
    },
    {
      "name": "General Awareness",
      "code": "GA",
      "color": "#F59E0B",
      "order_index": 4,
      "chapters": [
        {
          "name": "National Health Missions & Health Protocols",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Current Affairs & Healthcare Milestones",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Indian Polity, Culture & General Knowledge",
          "order_index": 3,
          "estimated_hours": 6
        }
      ]
    }
  ]
},
{
  "id": "rrb-section-controller-seed",
  "name": "RRB Section Controller (Traffic & Operations)",
  "slug": "rrb-section-controller",
  "category": "student",
  "exam_type": "sarkari",
  "popularity_score": 885,
  "description": "Train Traffic Movement, Signalling & Section Control (Level 6 Direct/LDCE)",
  "color": "#4F46E5",
  "icon_name": "compass",
  "subjects": [
    {
      "name": "Railway Operating Rules & Section Control (G&SR)",
      "code": "GSR_OPER",
      "color": "#DC2626",
      "order_index": 1,
      "chapters": [
        {
          "name": "General & Subsidiary Rules (G&SR) & Block Working",
          "order_index": 1,
          "estimated_hours": 12
        },
        {
          "name": "Train Ordering, Control Charting & Traffic Priorities",
          "order_index": 2,
          "estimated_hours": 10
        },
        {
          "name": "Absolute Block & Automatic Block Signalling Systems",
          "order_index": 3,
          "estimated_hours": 10
        },
        {
          "name": "Caution Orders, Speed Restrictions & Line Block Protocol",
          "order_index": 4,
          "estimated_hours": 8
        },
        {
          "name": "Unusual Occurrences, Accidents & Relief Train Protocols",
          "order_index": 5,
          "estimated_hours": 10
        },
        {
          "name": "Freight & Passenger Train Scheduling & Punctuality",
          "order_index": 6,
          "estimated_hours": 8
        }
      ]
    },
    {
      "name": "General Studies & Railway Infrastructure",
      "code": "GS_RAIL",
      "color": "#F59E0B",
      "order_index": 2,
      "chapters": [
        {
          "name": "Indian Railways Organization, Zones & Divisions",
          "order_index": 1,
          "estimated_hours": 8
        },
        {
          "name": "Railway Budget, Operating Ratio & Freight Earnings",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Indian Geography (Railway Routes & Dedicated Freight Corridors)",
          "order_index": 3,
          "estimated_hours": 8
        },
        {
          "name": "Indian Constitution & Administrative Law",
          "order_index": 4,
          "estimated_hours": 6
        },
        {
          "name": "Science & Technology in Railways (Kavach, Vande Bharat)",
          "order_index": 5,
          "estimated_hours": 6
        }
      ]
    },
    {
      "name": "Advanced Quantitative Aptitude",
      "code": "ADV_QA",
      "color": "#3B82F6",
      "order_index": 3,
      "chapters": [
        {
          "name": "Number Systems, Factors & Equations",
          "order_index": 1,
          "estimated_hours": 6
        },
        {
          "name": "Percentages, Ratio, Proportion & Averages",
          "order_index": 2,
          "estimated_hours": 6
        },
        {
          "name": "Time, Speed, Distance, Train Crossings & Relative Speeds",
          "order_index": 3,
          "estimated_hours": 8
        },
        {
          "name": "Time & Work, Pipe Cisterns & Resource Optimization",
          "order_index": 4,
          "estimated_hours": 8
        },
        {
          "name": "Data Interpretation (Complex Tables, Multiple Charts)",
          "order_index": 5,
          "estimated_hours": 8
        }
      ]
    },
    {
      "name": "General Intelligence & Critical Reasoning",
      "code": "REAS_CRIT",
      "color": "#8B5CF6",
      "order_index": 4,
      "chapters": [
        {
          "name": "Critical Decision Making & Situational Analysis",
          "order_index": 1,
          "estimated_hours": 8
        },
        {
          "name": "High-Complexity Puzzles & Scheduling Matrices",
          "order_index": 2,
          "estimated_hours": 8
        },
        {
          "name": "Syllogisms, Logical Sequences & Statement-Action",
          "order_index": 3,
          "estimated_hours": 6
        },
        {
          "name": "Analytical Reasoning & Information Processing",
          "order_index": 4,
          "estimated_hours": 6
        }
      ]
    }
  ]
}
];

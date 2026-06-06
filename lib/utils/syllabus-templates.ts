export interface TemplateTopic {
  subject: string;
  chapter: string;
  topic: string;
  order_index: number;
}

export interface SyllabusTemplate {
  name: string;
  description: string;
  subjects: string[];
  topics: TemplateTopic[];
}

const NEET_TOPICS: TemplateTopic[] = [
  // Physics (29 chapters)
  ...[
    'Physical World',
    'Units & Measurements',
    'Motion in a Straight Line',
    'Motion in a Plane',
    'Laws of Motion',
    'Work Energy and Power',
    'System of Particles',
    'Gravitation',
    'Mechanical Properties of Solids',
    'Mechanical Properties of Fluids',
    'Thermal Properties of Matter',
    'Thermodynamics',
    'Kinetic Theory',
    'Oscillations',
    'Waves',
    'Electric Charges',
    'Electrostatic Potential',
    'Current Electricity',
    'Moving Charges and Magnetism',
    'Magnetism and Matter',
    'Electromagnetic Induction',
    'Alternating Current',
    'EM Waves',
    'Ray Optics',
    'Wave Optics',
    'Dual Nature of Radiation',
    'Atoms',
    'Nuclei',
    'Semiconductor Electronics',
  ].map((chapter, idx) => ({
    subject: 'Physics',
    chapter,
    topic: `Core concepts of ${chapter}`,
    order_index: idx,
  })),

  // Chemistry (29 chapters)
  ...[
    'Some Basic Concepts of Chemistry',
    'Structure of Atom',
    'Classification of Elements & Periodicity',
    'Chemical Bonding',
    'States of Matter',
    'Thermodynamics',
    'Equilibrium',
    'Redox Reactions',
    'Hydrogen',
    's-Block Elements',
    'p-Block Elements',
    'Organic Chemistry: Basic Principles & Techniques',
    'Hydrocarbons',
    'Environmental Chemistry',
    'Solid State',
    'Solutions',
    'Electrochemistry',
    'Chemical Kinetics',
    'Surface Chemistry',
    'General Principles & Processes of Isolation',
    'd & f Block Elements',
    'Coordination Compounds',
    'Haloalkanes & Haloarenes',
    'Alcohols Phenols & Ethers',
    'Aldehydes Ketones & Carboxylic Acids',
    'Amines',
    'Biomolecules',
    'Polymers',
    'Chemistry in Everyday Life',
  ].map((chapter, idx) => ({
    subject: 'Chemistry',
    chapter,
    topic: `Core concepts of ${chapter}`,
    order_index: idx,
  })),

  // Biology (38 chapters)
  ...[
    'The Living World',
    'Biological Classification',
    'Plant Kingdom',
    'Animal Kingdom',
    'Morphology of Flowering Plants',
    'Anatomy of Flowering Plants',
    'Structural Organisation in Animals',
    'Cell: The Unit of Life',
    'Biomolecules',
    'Cell Cycle & Cell Division',
    'Transport in Plants',
    'Mineral Nutrition',
    'Photosynthesis in Higher Plants',
    'Respiration in Plants',
    'Plant Growth & Development',
    'Digestion & Absorption',
    'Breathing & Exchange of Gases',
    'Body Fluids & Circulation',
    'Excretory Products & their Elimination',
    'Locomotion & Movement',
    'Neural Control & Coordination',
    'Chemical Coordination & Integration',
    'Reproduction in Organisms',
    'Sexual Reproduction in Flowering Plants',
    'Human Reproduction',
    'Reproductive Health',
    'Principles of Inheritance & Variation',
    'Molecular Basis of Inheritance',
    'Evolution',
    'Human Health & Disease',
    'Strategies for Enhancement in Food Production',
    'Microbes in Human Welfare',
    'Biotechnology: Principles & Processes',
    'Biotechnology & its Applications',
    'Organisms & Populations',
    'Ecosystem',
    'Biodiversity & Conservation',
    'Environmental Issues',
  ].map((chapter, idx) => ({
    subject: 'Biology',
    chapter,
    topic: `Core concepts of ${chapter}`,
    order_index: idx,
  })),
];

const JEE_TOPICS: TemplateTopic[] = [
  // Physics (Same as NEET Physics)
  ...NEET_TOPICS.filter((t) => t.subject === 'Physics'),

  // Chemistry (Same as NEET Chemistry)
  ...NEET_TOPICS.filter((t) => t.subject === 'Chemistry'),

  // Math (16 chapters)
  ...[
    'Sets, Relations & Functions',
    'Complex Numbers & Quadratic Equations',
    'Matrices & Determinants',
    'Permutations & Combinations',
    'Mathematical Induction',
    'Binomial Theorem',
    'Sequences & Series',
    'Limit, Continuity & Differentiability',
    'Integral Calculus',
    'Differential Equations',
    'Co-ordinate Geometry',
    'Three Dimensional Geometry',
    'Vector Algebra',
    'Statistics & Probability',
    'Trigonometry',
    'Mathematical Reasoning',
  ].map((chapter, idx) => ({
    subject: 'Math',
    chapter,
    topic: `Core concepts of ${chapter}`,
    order_index: idx,
  })),
];

const UPSC_TOPICS: TemplateTopic[] = [
  // GS Paper 1
  ...[
    'Indian Heritage and Culture',
    'History of the World',
    'Society',
    'Geography of India & World',
  ].map((chapter, idx) => ({
    subject: 'GS Paper 1',
    chapter,
    topic: `Preparation for ${chapter}`,
    order_index: idx,
  })),

  // GS Paper 2
  ...[
    'Constitution & Polity',
    'Governance',
    'Social Justice',
    'International Relations',
  ].map((chapter, idx) => ({
    subject: 'GS Paper 2',
    chapter,
    topic: `Preparation for ${chapter}`,
    order_index: idx,
  })),

  // GS Paper 3
  ...[
    'Technology',
    'Economic Development',
    'Bio-diversity & Environment',
    'Security & Disaster Management',
  ].map((chapter, idx) => ({
    subject: 'GS Paper 3',
    chapter,
    topic: `Preparation for ${chapter}`,
    order_index: idx,
  })),

  // GS Paper 4
  ...[
    'Ethics and Human Interface',
    'Attitude & Aptitude',
    'Emotional Intelligence',
    'Contributions of Thinkers',
    'Public Service Values',
    'Probity in Governance',
  ].map((chapter, idx) => ({
    subject: 'GS Paper 4',
    chapter,
    topic: `Preparation for ${chapter}`,
    order_index: idx,
  })),

  // CSAT
  ...[
    'Comprehension',
    'Interpersonal Skills',
    'Logical Reasoning',
    'Decision Making',
    'General Mental Ability',
    'Basic Numeracy',
  ].map((chapter, idx) => ({
    subject: 'CSAT',
    chapter,
    topic: `Preparation for ${chapter}`,
    order_index: idx,
  })),
];

const SSC_CGL_TOPICS: TemplateTopic[] = [
  // Quantitative Aptitude
  ...[
    'Number Systems',
    'Percentages',
    'Profit & Loss',
    'Simple & Compound Interest',
    'Ratio & Proportion',
    'Time, Work & Distance',
    'Algebra',
    'Geometry',
    'Trigonometry',
    'Data Interpretation',
  ].map((chapter, idx) => ({
    subject: 'Quant',
    chapter,
    topic: `Preparation for ${chapter}`,
    order_index: idx,
  })),

  // English
  ...[
    'Grammar & Error Spotting',
    'Reading Comprehension',
    'Cloze Test',
    'Synonyms & Antonyms',
    'Idioms & Phrases',
    'One Word Substitution',
  ].map((chapter, idx) => ({
    subject: 'English',
    chapter,
    topic: `Preparation for ${chapter}`,
    order_index: idx,
  })),

  // GK
  ...[
    'History',
    'Geography',
    'Polity & Constitution',
    'Economy',
    'General Science',
    'Current Affairs',
  ].map((chapter, idx) => ({
    subject: 'GK',
    chapter,
    topic: `Preparation for ${chapter}`,
    order_index: idx,
  })),

  // Reasoning
  ...[
    'Analogy',
    'Classification',
    'Series Completion',
    'Coding-Decoding',
    'Blood Relations',
    'Direction Sense',
    'Venn Diagrams',
    'Non-Verbal Reasoning',
  ].map((chapter, idx) => ({
    subject: 'Reasoning',
    chapter,
    topic: `Preparation for ${chapter}`,
    order_index: idx,
  })),
];

const WORK_SKILLS_TOPICS: TemplateTopic[] = [
  ...[
    'Technical Skills',
    'Soft Skills',
    'Industry Knowledge',
    'Leadership',
    'Project Management',
    'Communication',
  ].map((subject, idx) => ({
    subject,
    chapter: 'General Improvement',
    topic: `Core development in ${subject}`,
    order_index: idx,
  })),
];

export const SYLLABUS_TEMPLATES: Record<string, SyllabusTemplate> = {
  NEET: {
    name: 'NEET 2026',
    description: 'Adds standard preparation syllabus for Medical entrance (Physics, Chemistry, Biology).',
    subjects: ['Physics', 'Chemistry', 'Biology'],
    topics: NEET_TOPICS,
  },
  JEE: {
    name: 'JEE',
    description: 'Adds standard preparation syllabus for Engineering entrance (Physics, Chemistry, Math).',
    subjects: ['Physics', 'Chemistry', 'Math'],
    topics: JEE_TOPICS,
  },
  UPSC: {
    name: 'UPSC Civil Services',
    description: 'Adds standard GS Paper 1-4 syllabus plus CSAT topics for IAS preparation.',
    subjects: ['GS Paper 1', 'GS Paper 2', 'GS Paper 3', 'GS Paper 4', 'CSAT'],
    topics: UPSC_TOPICS,
  },
  SSC_CGL: {
    name: 'SSC CGL',
    description: 'Adds Quantitative Aptitude, English Comprehension, General Awareness, and Reasoning.',
    subjects: ['Quant', 'English', 'GK', 'Reasoning'],
    topics: SSC_CGL_TOPICS,
  },
  WORK_SKILLS: {
    name: 'Work Skills Development',
    description: 'Add core subjects for professional and skill growth.',
    subjects: [
      'Technical Skills',
      'Soft Skills',
      'Industry Knowledge',
      'Leadership',
      'Project Management',
      'Communication',
    ],
    topics: WORK_SKILLS_TOPICS,
  },
};

export function getDefaultSubjectsForProfile(
  category: string,
  subCategory: string[]
): string[] {
  const subCatLower = subCategory.map((s) => s.toLowerCase());

  // NEET subjects
  if (subCatLower.some((s) => s.includes('neet'))) {
    return ['Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology'];
  }

  // JEE subjects
  if (subCatLower.some((s) => s.includes('jee'))) {
    return ['Physics', 'Chemistry', 'Mathematics'];
  }

  // UPSC subjects
  if (subCatLower.some((s) => s.includes('upsc'))) {
    return [
      'General Studies 1',
      'General Studies 2',
      'General Studies 3',
      'General Studies 4',
      'CSAT',
      'Essay',
      'Optional Subject',
      'Current Affairs',
      'Polity',
      'History',
      'Geography',
      'Economy',
      'Environment',
      'Science & Technology',
    ];
  }

  // SSC subjects
  if (subCatLower.some((s) => s.includes('ssc'))) {
    return [
      'Quantitative Aptitude',
      'English Language',
      'General Intelligence / Reasoning',
      'General Awareness',
      'Current Affairs',
    ];
  }

  // Banking exams
  if (
    subCatLower.some(
      (s) =>
        s.includes('ibps') ||
        s.includes('sbi') ||
        s.includes('rbi') ||
        s.includes('banking')
    )
  ) {
    return [
      'Quantitative Aptitude',
      'Reasoning Ability',
      'English Language',
      'General Awareness',
      'Computer Knowledge',
      'Professional Knowledge',
    ];
  }

  // CAT/MBA
  if (
    subCatLower.some(
      (s) =>
        s.includes('cat') ||
        s.includes('xat') ||
        s.includes('gmat') ||
        s.includes('mba')
    )
  ) {
    return [
      'Verbal Ability & Reading Comprehension',
      'Data Interpretation & Logical Reasoning',
      'Quantitative Ability',
    ];
  }

  // GATE
  if (subCatLower.some((s) => s.includes('gate'))) {
    return [
      'Engineering Mathematics',
      'General Aptitude',
      'Core Subject',
      'Technical Subjects',
    ];
  }

  // CA
  if (subCatLower.some((s) => s.includes('ca '))) {
    return [
      'Accounts',
      'Law',
      'Taxation',
      'Audit',
      'Costing',
      'Financial Management',
      'Strategic Management',
      'Economics',
    ];
  }

  // Employee categories
  if (category === 'employee') {
    return [
      'Technical Skills',
      'Soft Skills',
      'Industry Knowledge',
      'Leadership',
      'Project Management',
      'Communication',
      'Other',
    ];
  }

  // Creator
  if (category === 'creator') {
    return [
      'Content Creation',
      'Video Editing',
      'Photography',
      'Scriptwriting',
      'SEO / Marketing',
      'Design Skills',
      'Business Skills',
      'Other',
    ];
  }

  // Entrepreneur
  if (category === 'entrepreneur') {
    return [
      'Product Development',
      'Marketing & Sales',
      'Finance & Accounting',
      'Operations',
      'Leadership & HR',
      'Strategy',
      'Technology',
      'Customer Development',
      'Other',
    ];
  }

  // Default fallback
  return ['Main Subject', 'Supporting Subject', 'General Skills', 'Other'];
}

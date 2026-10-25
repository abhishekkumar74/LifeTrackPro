import { SEED_EXAMS } from '@/lib/constants/exams-seed';

export function getDefaultSubjectsForProfile(
  category: string,
  subCategory: string[]
): string[] {
  const cleanSubCats = (subCategory || []).filter((s) => s !== 'cse_student');
  const activeSubCats = cleanSubCats.slice(0, 2);
  const matchedExams = activeSubCats
    .map((s) => {
      const sLower = s.toLowerCase();
      return SEED_EXAMS.find(
        (e) =>
          e.id === s ||
          e.slug.toLowerCase() === sLower ||
          e.name.toLowerCase() === sLower ||
          sLower.includes(e.name.toLowerCase()) ||
          sLower.includes(e.slug.toLowerCase())
      );
    })
    .filter(Boolean);

  if (matchedExams.length > 0) {
    const result: string[] = [];
    matchedExams.forEach((exam: any) => {
      exam.subjects.forEach((sub: any) => {
        const name = sub.name;
        if (!result.includes(name)) {
          result.push(name);
        }
      });
    });
    return result;
  }

  // CSE subjects
  if (category === 'cse_student') {
    return [
      'Data Structures & Algorithms',
      'Java Programming',
      'Object Oriented Design (OOD)',
      'System Design',
      'Backend Development',
      'Computer Science Fundamentals',
      'Interview Preparation',
      'Web Development',
      'Cloud & DevOps',
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

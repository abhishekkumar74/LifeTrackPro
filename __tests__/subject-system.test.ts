import { getDefaultSubjectsForProfile } from '../lib/utils/profile-subjects';

describe('Profile-Based Subjects', () => {
  test('NEET student gets correct subjects', () => {
    const subjects = getDefaultSubjectsForProfile('student', ['NEET']);
    expect(subjects).toContain('Physics');
    expect(subjects).toContain('Chemistry');
    expect(subjects).toContain('Biology');
    expect(subjects).not.toContain('Polity');
    expect(subjects).not.toContain('History');
  });

  test('UPSC student gets GS subjects', () => {
    const subjects = getDefaultSubjectsForProfile('student', ['UPSC CSE']);
    expect(subjects).toContain('General Studies 1');
    expect(subjects).toContain('Polity');
    expect(subjects).not.toContain('Physics');
    expect(subjects).not.toContain('Biology');
  });

  test('Employee gets work subjects', () => {
    const subjects = getDefaultSubjectsForProfile('employee', ['Corporate / MNC']);
    expect(subjects).toContain('Technical Skills');
    expect(subjects).not.toContain('Physics');
    expect(subjects).not.toContain('Biology');
  });

  test('JEE student gets Math not Biology', () => {
    const subjects = getDefaultSubjectsForProfile('student', ['JEE Main']);
    expect(subjects).toContain('Mathematics');
    expect(subjects).toContain('Physics');
    expect(subjects).not.toContain('Biology');
  });

  test('Unknown profile returns fallback', () => {
    const subjects = getDefaultSubjectsForProfile('unknown', []);
    expect(subjects.length).toBeGreaterThan(0);
    expect(subjects).toContain('Other');
  });
});

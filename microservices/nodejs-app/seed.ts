export interface Course {
  id:         string;
  code:       string;
  name:       string;
  instructor: string;
  credits:    number;
  schedule:   string;
  status:     string;
}

export interface Enrolment {
  id:         string;
  studentId:  string;
  courseId:   string;
  grade:      string;
  status:     string;
  enrolledAt: string;
}

export const SEED_COURSES: Course[] = [
  { id: 'CLO101', code: 'CLO101', name: 'Cloud Engineering Fundamentals',      instructor: 'Dr. Afolabi',   credits: 4, schedule: 'Mon/Wed 09:00',      status: 'Active' },
  { id: 'DEV201', code: 'DEV201', name: 'DevOps & CI/CD Pipelines',             instructor: 'Mr. Chukwu',    credits: 4, schedule: 'Tue/Thu 11:00',      status: 'Active' },
  { id: 'PY301',  code: 'PY301',  name: 'Python for Cloud Automation',          instructor: 'Ms. Adeyemi',   credits: 3, schedule: 'Mon/Fri 14:00',      status: 'Active' },
  { id: 'NET401', code: 'NET401', name: 'Networking & Security Fundamentals',   instructor: 'Dr. Ibrahim',   credits: 3, schedule: 'Wed/Fri 10:00',      status: 'Active' },
  { id: 'LNX101', code: 'LNX101', name: 'Linux Systems Administration',         instructor: 'Mr. Okonkwo',   credits: 3, schedule: 'Tue/Thu 14:00',      status: 'Active' },
  { id: 'SEC201', code: 'SEC201', name: 'Cloud Security & Compliance',          instructor: 'Ms. Babatunde', credits: 4, schedule: 'Mon/Wed/Fri 13:00', status: 'Active' },
];

export const SEED_ENROLMENTS: Enrolment[] = [
  { id: 'ENR001', studentId: 'STU001', courseId: 'CLO101', grade: 'A', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR002', studentId: 'STU001', courseId: 'DEV201', grade: 'A', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR003', studentId: 'STU001', courseId: 'PY301',  grade: 'B', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR004', studentId: 'STU002', courseId: 'CLO101', grade: 'A', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR005', studentId: 'STU002', courseId: 'DEV201', grade: 'B', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR006', studentId: 'STU002', courseId: 'NET401', grade: 'A', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR007', studentId: 'STU003', courseId: 'CLO101', grade: 'B', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR008', studentId: 'STU003', courseId: 'DEV201', grade: 'A', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR009', studentId: 'STU003', courseId: 'PY301',  grade: 'A', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR010', studentId: 'STU004', courseId: 'CLO101', grade: 'B', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR011', studentId: 'STU004', courseId: 'LNX101', grade: 'B', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR012', studentId: 'STU004', courseId: 'SEC201', grade: 'C', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR013', studentId: 'STU005', courseId: 'CLO101', grade: 'A', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR014', studentId: 'STU005', courseId: 'DEV201', grade: 'A', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR015', studentId: 'STU005', courseId: 'NET401', grade: 'B', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR016', studentId: 'STU006', courseId: 'PY301',  grade: 'C', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR017', studentId: 'STU006', courseId: 'LNX101', grade: 'B', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR018', studentId: 'STU006', courseId: 'SEC201', grade: 'B', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR019', studentId: 'STU007', courseId: 'CLO101', grade: 'A', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR020', studentId: 'STU007', courseId: 'DEV201', grade: 'A', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR021', studentId: 'STU007', courseId: 'SEC201', grade: 'A', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR022', studentId: 'STU008', courseId: 'PY301',  grade: 'B', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR023', studentId: 'STU008', courseId: 'NET401', grade: 'B', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR024', studentId: 'STU008', courseId: 'LNX101', grade: 'A', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR025', studentId: 'STU009', courseId: 'CLO101', grade: 'C', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR026', studentId: 'STU009', courseId: 'DEV201', grade: 'C', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR027', studentId: 'STU010', courseId: 'CLO101', grade: 'A', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR028', studentId: 'STU010', courseId: 'DEV201', grade: 'B', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR029', studentId: 'STU010', courseId: 'PY301',  grade: 'A', status: 'Active', enrolledAt: '2026-01-10' },
  { id: 'ENR030', studentId: 'STU010', courseId: 'NET401', grade: 'A', status: 'Active', enrolledAt: '2026-01-10' },
];

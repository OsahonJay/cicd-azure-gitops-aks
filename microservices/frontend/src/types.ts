export interface Student {
  id:         string;
  name:       string;
  email:      string;
  year:       number;
  programme:  string;
  status:     string;
}

export interface Course {
  id:            string;
  code:          string;
  name:          string;
  instructor:    string;
  credits:       number;
  schedule:      string;
  status:        string;
  enrolledCount?: number;
}

export interface Enrolment {
  id:         string;
  studentId:  string;
  courseId:   string;
  grade:      string;
  status:     string;
  enrolledAt: string;
}

export interface GradeDistribution {
  A: number;
  B: number;
  C: number;
}

export interface CourseEnrolmentCount {
  code:  string;
  name:  string;
  count: number;
}

export interface ReportSummary {
  totalStudents:        number;
  activeStudents:       number;
  totalCourses:         number;
  totalEnrolments:      number;
  averageGpa:           number;
  gradeDistribution:    GradeDistribution;
  enrolmentsPerCourse:  CourseEnrolmentCount[];
}

export interface TopStudent {
  id:          string;
  name:        string;
  programme:   string;
  gpa:         number;
  courseCount: number;
}

export interface StudentCourseDetail {
  courseId:   string;
  courseName: string;
  grade:      string;
  gpaPoints:  number;
}

export interface StudentReport {
  id:         string;
  name:       string;
  programme:  string;
  status:     string;
  gpa:        number;
  courses:    StudentCourseDetail[];
}

export interface CourseReport {
  id:                string;
  code:              string;
  name:              string;
  enrolledCount:     number;
  averageGpa:        number;
  passRate:          number;
  gradeDistribution: Record<string, number>;
}

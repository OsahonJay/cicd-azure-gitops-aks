import type {
  Student, Course, Enrolment,
  ReportSummary, TopStudent, StudentReport, CourseReport,
} from './types';

const handle = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json() as Promise<T>;
};

const API_KEY = import.meta.env.VITE_API_KEY ?? '';

const json = (method: string, body: unknown) => ({
  method,
  headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
  body: JSON.stringify(body),
});

const del = () => ({ method: 'DELETE', headers: { 'X-API-Key': API_KEY } });

export const getStudents   = ()                              => fetch('/api/students').then(r => handle<Student[]>(r));
export const getStudent    = (id: string)                    => fetch(`/api/students/${id}`).then(r => handle<Student>(r));
export const createStudent = (data: Partial<Student>)        => fetch('/api/students', json('POST', data)).then(r => handle<Student>(r));
export const updateStudent = (id: string, d: Partial<Student>) => fetch(`/api/students/${id}`, json('PUT', d)).then(r => handle<Student>(r));
export const deleteStudent = (id: string)                    => fetch(`/api/students/${id}`, del()).then(r => handle<{ message: string }>(r));

export const getCourses   = ()                              => fetch('/api/courses').then(r => handle<Course[]>(r));
export const getCourse    = (id: string)                    => fetch(`/api/courses/${id}`).then(r => handle<Course>(r));
export const createCourse = (data: Partial<Course>)         => fetch('/api/courses', json('POST', data)).then(r => handle<Course>(r));
export const updateCourse = (id: string, d: Partial<Course>) => fetch(`/api/courses/${id}`, json('PUT', d)).then(r => handle<Course>(r));
export const deleteCourse = (id: string)                    => fetch(`/api/courses/${id}`, del()).then(r => handle<{ message: string }>(r));

export const getEnrolments = (params: Record<string, string> = {}) => {
  const q = new URLSearchParams(params).toString();
  return fetch(`/api/enrolments${q ? '?' + q : ''}`).then(r => handle<Enrolment[]>(r));
};
export const createEnrolment = (data: Partial<Enrolment>) => fetch('/api/enrolments', json('POST', data)).then(r => handle<Enrolment>(r));
export const dropEnrolment   = (id: string)               => fetch(`/api/enrolments/${id}`, del()).then(r => handle<{ message: string }>(r));

export const getReportSummary = ()          => fetch('/api/reports/summary').then(r => handle<ReportSummary>(r));
export const getTopStudents   = ()          => fetch('/api/reports/top-students').then(r => handle<TopStudent[]>(r));
export const getStudentReport = (id: string) => fetch(`/api/reports/student/${id}`).then(r => handle<StudentReport>(r));
export const getCourseReport  = (id: string) => fetch(`/api/reports/course/${id}`).then(r => handle<CourseReport>(r));

import express, { Request, Response } from 'express';
import cors from 'cors';
import { SEED_COURSES, SEED_ENROLMENTS, Course, Enrolment } from './seed';

const app     = express();
const PORT    = process.env.PORT    ?? 3000;
const VERSION = process.env.APP_VERSION ?? '2.0.0';
const API_KEY = process.env.API_KEY ?? '';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '';

app.use(cors({ origin: ALLOWED_ORIGIN || false }));
app.use(express.json());

app.use((req, res, next) => {
  if (req.path === '/health' || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  if (req.headers['x-api-key'] !== API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
});

let courses:    Course[]    = JSON.parse(JSON.stringify(SEED_COURSES));
let enrolments: Enrolment[] = JSON.parse(JSON.stringify(SEED_ENROLMENTS));
let enrCounter: number      = SEED_ENROLMENTS.length + 1;

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'course-service', version: VERSION });
});

app.get('/api/courses', (_req: Request, res: Response) => {
  const result = courses.map(c => ({
    ...c,
    enrolledCount: enrolments.filter(e => e.courseId === c.id && e.status === 'Active').length,
  }));
  res.json(result);
});

app.post('/api/courses', (req: Request, res: Response) => {
  const { code, name, instructor, credits, schedule, status } = req.body as Partial<Course>;
  if (!code || !name) {
    res.status(400).json({ error: 'code and name are required' });
    return;
  }
  if (courses.find(c => c.id === code)) {
    res.status(409).json({ error: 'Course code already exists' });
    return;
  }
  const course: Course = {
    id: code, code, name,
    instructor: instructor ?? '',
    credits:    credits    ?? 3,
    schedule:   schedule   ?? '',
    status:     status     ?? 'Active',
  };
  courses.push(course);
  res.status(201).json(course);
});

app.get('/api/courses/:id', (req: Request, res: Response) => {
  const course = courses.find(c => c.id === req.params.id);
  if (!course) { res.status(404).json({ error: 'Course not found' }); return; }
  const enrolled = enrolments.filter(
    e => e.courseId === req.params.id && e.status === 'Active'
  );
  res.json({ ...course, enrolledCount: enrolled.length, enrolments: enrolled });
});

app.put('/api/courses/:id', (req: Request, res: Response) => {
  const course = courses.find(c => c.id === req.params.id);
  if (!course) { res.status(404).json({ error: 'Course not found' }); return; }
  const { id: _ignored, ...updates } = req.body as Partial<Course> & { id?: string };
  Object.assign(course, updates);
  res.json(course);
});

app.delete('/api/courses/:id', (req: Request, res: Response) => {
  const idx = courses.findIndex(c => c.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: 'Course not found' }); return; }
  courses.splice(idx, 1);
  res.json({ message: `Course ${req.params.id} deleted` });
});

app.get('/api/enrolments', (req: Request, res: Response) => {
  const { studentId, courseId } = req.query as { studentId?: string; courseId?: string };
  let result = enrolments;
  if (studentId) result = result.filter(e => e.studentId === studentId);
  if (courseId)  result = result.filter(e => e.courseId  === courseId);
  res.json(result);
});

app.post('/api/enrolments', (req: Request, res: Response) => {
  const { studentId, courseId, grade } = req.body as Partial<Enrolment>;
  if (!studentId || !courseId) {
    res.status(400).json({ error: 'studentId and courseId are required' });
    return;
  }
  const already = enrolments.find(
    e => e.studentId === studentId && e.courseId === courseId && e.status === 'Active'
  );
  if (already) {
    res.status(409).json({ error: 'Student already enrolled in this course' });
    return;
  }
  const enrolment: Enrolment = {
    id:         `ENR${String(enrCounter++).padStart(3, '0')}`,
    studentId,
    courseId,
    grade:      grade ?? 'Pending',
    status:     'Active',
    enrolledAt: new Date().toISOString().slice(0, 10),
  };
  enrolments.push(enrolment);
  res.status(201).json(enrolment);
});

app.delete('/api/enrolments/:id', (req: Request, res: Response) => {
  const enrolment = enrolments.find(e => e.id === req.params.id);
  if (!enrolment) { res.status(404).json({ error: 'Enrolment not found' }); return; }
  enrolment.status = 'Dropped';
  res.json({ message: `Enrolment ${req.params.id} dropped` });
});


app.listen(PORT, () =>
  console.log(`Course service v${VERSION} running on port ${PORT}`)
);

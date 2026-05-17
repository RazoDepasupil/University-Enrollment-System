import { sys, saveData } from "../shared.js";

const SEM_LABEL = { 1: "First Semester", 2: "Second Semester", 3: "Mid-Year" };

function getLatestEnrollmentRecords(enrollments) {
  const map = new Map();
  for (const e of enrollments) {
    const key = `${e.academicYear}||${e.semester}||${e.course.code}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, e);
      continue;
    }

    const existingScore = getEnrollmentPriority(existing);
    const currentScore = getEnrollmentPriority(e);
    if (currentScore > existingScore) {
      map.set(key, e);
    }
  }
  return [...map.values()];
}

function getEnrollmentPriority(enrollment) {
  let score = 0;
  if (enrollment.status === "enrolled") score += 200;
  if (enrollment.grade) score += 100;
  if (enrollment.status === "dropped") score -= 100;
  score += new Date(enrollment.date).getTime() / 1000;
  return score;
}

function getLatestCourseRecords(enrollments) {
  const map = new Map();
  for (const e of enrollments) {
    const key = `${e.student.id}||${e.course.code}`;
    const existing = map.get(key);
    if (
      !existing ||
      getEnrollmentPriority(e) > getEnrollmentPriority(existing)
    ) {
      map.set(key, e);
    }
  }
  return [...map.values()];
}

// GET /grades — student sees their grades grouped by AY + semester
export function getGrades(req, res) {
  const { id } = req.user;
  let enrollments = sys.getStudentGrades(id);
  enrollments = getLatestEnrollmentRecords(enrollments);

  // Group by academicYear + semester
  const grouped = {};
  for (const e of enrollments) {
    const key = `${e.academicYear}||${e.semester}`;
    if (!grouped[key])
      grouped[key] = {
        academicYear: e.academicYear,
        semester: e.semester,
        subjects: [],
      };
    grouped[key].subjects.push({
      courseCode: e.course.code,
      courseTitle: e.course.title,
      units: e.course.units,
      schedule: e.course.schedule,
      status: e.status,
      date: e.date,
      grade: e.grade,
    });
  }

  // Sort AY asc, semester asc
  const periods = Object.values(grouped).sort((a, b) => {
    if (a.academicYear !== b.academicYear)
      return a.academicYear.localeCompare(b.academicYear);
    return a.semester - b.semester;
  });

  // GWA across all graded
  const allGraded = enrollments.filter(
    (e) => e.grade && !["INC", "DRP"].includes(e.grade),
  );
  let gwa = null;
  if (allGraded.length) {
    const totalUnits = allGraded.reduce((s, e) => s + e.course.units, 0);
    const weightedSum = allGraded.reduce(
      (s, e) => s + parseFloat(e.grade) * e.course.units,
      0,
    );
    gwa = (weightedSum / totalUnits).toFixed(4);
  }

  const totalUnits = enrollments.reduce((s, e) => s + e.course.units, 0);
  const gradedCount = allGraded.length;
  const pendingCount = enrollments.filter((e) => !e.grade).length;

  res.json({ periods, gwa, totalUnits, gradedCount, pendingCount });
}

// GET /grades/all — faculty sees all students' grades (filtered by their courses)
export function getAllGrades(req, res) {
  const { id: facultyId } = req.user;
  // Only show enrollments for courses this faculty handles
  const facultyCourses = new Set(
    sys.courses.filter((c) => c.facultyId === facultyId).map((c) => c.code),
  );

  const rows = getLatestCourseRecords(
    sys.enrollments.filter((e) => facultyCourses.has(e.course.code)),
  ).map((e) => ({
    enrollmentId: e.id,
    studentId: e.student.id,
    studentName: e.student.name,
    studentProgram: e.student.program,
    courseCode: e.course.code,
    courseTitle: e.course.title,
    units: e.course.units,
    academicYear: e.academicYear,
    semester: e.semester,
    status: e.status,
    date: e.date,
    grade: e.grade,
  }));
  res.json(rows);
}

// POST /grades — faculty posts/updates a grade
export async function postGrade(req, res) {
  const { studentId, courseCode, grade } = req.body;
  if (!studentId || !courseCode || grade === undefined)
    return res
      .status(400)
      .json({ error: "studentId, courseCode, and grade are required" });

  // Verify the faculty actually handles this course
  const { id: facultyId } = req.user;
  const course = sys.findCourseByCode(courseCode);
  if (!course) return res.status(404).json({ error: "Course not found" });
  if (course.facultyId !== facultyId)
    return res
      .status(403)
      .json({ error: "You are not assigned to this course" });

  const result = sys.postGrade(studentId, courseCode, grade);
  if (result.success) await saveData();

  res.status(result.success ? 200 : 400).json({
    success: result.success,
    message: result.message,
  });
}

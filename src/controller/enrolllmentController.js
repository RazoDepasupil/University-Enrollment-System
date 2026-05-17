import { sys, saveData } from "../shared.js";

export function getEnrollment(req, res) {
  const { id } = req.user;
  const enrollments = sys.getStudentEnrollments(id).map((e) => ({
    id: e.id,
    courseCode: e.course.code,
    courseTitle: e.course.title,
    schedule: e.course.schedule,
    units: e.course.units,
    status: e.status,
    date: e.date,
    hasPendingDrop: sys.hasPendingDropRequest(id, e.course.code),
  }));

  res.json({
    enrollments,
    totalUnits: sys.getTotalUnits(id),
    pendingDrops: sys.getStudentDropRequests(id).filter((r) => r.isPending())
      .length,
  });
}

export async function enrollCourse(req, res) {
  const { courseCode } = req.body;
  if (!courseCode)
    return res.status(400).json({ error: "courseCode is required" });

  const result = sys.enroll(req.user.id, courseCode);
  if (result.success) await saveData();

  res
    .status(result.success ? 200 : 400)
    .json({ success: result.success, message: result.message });
}

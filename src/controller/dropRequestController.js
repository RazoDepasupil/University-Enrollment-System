import { sys, saveData } from "../shared.js";

export function getDropRequest(req, res) {
  const { id, role } = req.user;
  const raw =
    role === "student" ? sys.getStudentDropRequests(id) : sys.dropRequests;

  res.json(
    raw.map((r) => ({
      id: r.id,
      studentId: r.student.id,
      studentName: r.student.name,
      studentInitials: r.student.getInitials(),
      studentCourse: r.student.course || "",
      courseCode: r.course.code,
      courseTitle: r.course.title,
      courseUnits: r.course.units,
      reason: r.reason,
      status: r.status,
      date: r.date,
      facultyNote: r.facultyNote,
      isPending: r.isPending(),
    })),
  );
}

export async function postDropRequest(req, res) {
  const { courseCode, reason } = req.body;
  if (!courseCode || !reason)
    return res
      .status(400)
      .json({ error: "courseCode and reason are required" });

  const result = sys.requestDrop(req.user.id, courseCode, reason);
  if (result.success) await saveData();

  res
    .status(result.success ? 200 : 400)
    .json({ success: result.success, message: result.message });
}

export async function updateDropRequest(req, res) {
  const { action, note } = req.body;

  let result;
  if (action === "approve") result = sys.approveDropRequest(req.params.id);
  else if (action === "reject")
    result = sys.rejectDropRequest(req.params.id, note || "");
  else
    return res
      .status(400)
      .json({ error: "action must be 'approve' or 'reject'" });

  if (result.success) await saveData();
  res
    .status(result.success ? 200 : 400)
    .json({ success: result.success, message: result.message });
}

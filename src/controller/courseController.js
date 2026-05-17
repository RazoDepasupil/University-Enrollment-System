import { sys } from "../shared.js";

export function getCourses(req, res) {
  const { id, role } = req.user;
  const completed = role === "student" ? sys.getPassedCodes(id) : [];

  const courses = sys.courses
    .filter((c) => !(role === "student" && sys.hasCompleted(id, c.code)))
    .map((c) => {
      const cnt = sys.getEnrolledCount(c.code);
      const chk = c.checkPrerequisites(completed);
      return {
        code: c.code,
        title: c.title,
        units: c.units,
        capacity: c.capacity,
        schedule: c.schedule,
        prerequisites: c.prerequisites,
        enrolledCount: cnt,
        availableSlots: c.getAvailableSlots(cnt),
        isFull: !c.hasSlot(cnt),
        hasPrerequisites: c.hasPrerequisites(),
        prereqMet: chk.met,
        missingPrereqs: chk.missing,
        isEnrolled: role === "student" ? sys.isEnrolled(id, c.code) : false,
        hasPendingDrop:
          role === "student" ? sys.hasPendingDropRequest(id, c.code) : false,
      };
    });

  res.json(courses);
}

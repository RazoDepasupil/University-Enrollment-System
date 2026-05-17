import { sys } from "../shared.js";

export default function getRoster(req, res) {
  const roster = sys.courses.map((c) => {
    const cnt = sys.getEnrolledCount(c.code);
    const enrolled = sys.enrollments.filter(
      (e) => e.course.code === c.code && e.isActive(),
    );
    return {
      code: c.code,
      title: c.title,
      schedule: c.schedule,
      units: c.units,
      capacity: c.capacity,
      enrolledCount: cnt,
      students: enrolled.map((e) => ({
        name: e.student.name,
        id: e.student.id,
        date: e.date,
      })),
    };
  });
  res.json(roster);
}

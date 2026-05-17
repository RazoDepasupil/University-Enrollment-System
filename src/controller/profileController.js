import { sys } from "../shared.js";

export default function getProfile(req, res) {
  const { id, role } = req.user;

  if (role === 'student') {
    const student = sys.findStudentById(id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json({
      id:         student.id,
      name:       student.name,
      username:   student.username,
      program:    student.program,
      yearLevel:  student.yearLevel,
      email:      student.email,
      initials:   student.getInitials(),
      totalUnits: sys.getTotalUnits(id),
    });
  } else {
    // Faculty profile
    const faculty = sys.faculty.find(f => f.id === id);
    if (!faculty) return res.status(404).json({ error: "Faculty not found" });
    const myCourses = sys.courses.filter(c => c.facultyId === id).map(c => ({
      code: c.code, title: c.title, units: c.units, schedule: c.schedule,
      enrolled: sys.getEnrolledCount(c.code), capacity: c.capacity,
    }));
    res.json({
      id:      faculty.id,
      name:    faculty.name,
      username: faculty.username,
      dept:    faculty.dept,
      initials: faculty.getInitials(),
      courses: myCourses,
    });
  }
}

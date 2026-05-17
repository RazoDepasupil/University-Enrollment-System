import Course from "./Course.js";
import Student from "./Student.js";
import Faculty from "./Faculty.js";
import Enrollment from "./Enrollment.js";
import DropRequest from "./DropRequest.js";

function genId(prefix) {
  return prefix + Date.now() + Math.floor(Math.random() * 1000);
}

class EnrollmentSystem {
  #students = [];
  #faculty = [];
  #courses = [];
  #enrollments = [];
  #dropRequests = [];

  loadFromJSON(data) {
    this.#courses = data.courses.map((c) => new Course(c));

    const users = data.user || data.role || data;
    this.#students = (users.students || []).map((u) => new Student(u));
    this.#faculty = (users.faculty || []).map((u) => new Faculty(u));

    this.#enrollments = (data.enrollments || [])
      .map((e) => {
        const student = this.#findStudentById(e.studentId);
        const course = this.#findCourseByCode(e.courseCode);
        if (!student || !course) return null;
        return new Enrollment({
          id: e.id,
          student,
          course,
          status: e.status,
          date: e.date,
          grade: e.grade ?? null,
          academicYear: e.academicYear || null,
          semester: e.semester || null,
        });
      })
      .filter(Boolean);

    this.#dropRequests = (data.dropRequests || [])
      .map((r) => {
        const enrollment = this.#enrollments.find(
          (e) => e.student.id === r.studentId && e.course.code === r.courseCode,
        );
        if (!enrollment) return null;
        return new DropRequest({
          id: r.id,
          enrollment,
          reason: r.reason,
          status: r.status,
          date: r.date,
          facultyNote: r.facultyNote,
        });
      })
      .filter(Boolean);
  }

  toJSON() {
    return {
      user: {
        students: this.#students.map((s) => s.toJSON()),
        faculty: this.#faculty.map((f) => f.toJSON()),
      },
      courses: this.#courses.map((c) => c.toJSON()),
      enrollments: this.#enrollments.map((e) => e.toJSON()),
      dropRequests: this.#dropRequests.map((r) => r.toJSON()),
    };
  }

  /* ── Private finders ── */
  #findStudentById(id) {
    return this.#students.find((s) => s.id === id) || null;
  }
  #findCourseByCode(code) {
    return this.#courses.find((c) => c.code === code) || null;
  }
  #findDropReqById(id) {
    return this.#dropRequests.find((r) => r.id === id) || null;
  }

  /* ── Public finders ── */
  findStudentById(id) {
    return this.#findStudentById(id);
  }
  findCourseByCode(c) {
    return this.#findCourseByCode(c);
  }
  findDropReqById(id) {
    return this.#findDropReqById(id);
  }

  /* ── Getters ── */
  get courses() {
    return [...this.#courses];
  }
  get students() {
    return [...this.#students];
  }
  get faculty() {
    return [...this.#faculty];
  }
  get enrollments() {
    return [...this.#enrollments];
  }
  get dropRequests() {
    return [...this.#dropRequests];
  }

  /* ── Helpers ── */
  getEnrolledCount(code) {
    return this.#enrollments.filter(
      (e) => e.course.code === code && e.isActive(),
    ).length;
  }

  isEnrolled(sId, code) {
    return this.#enrollments.some(
      (e) => e.student.id === sId && e.course.code === code && e.isActive(),
    );
  }

  hasPendingDropRequest(sId, code) {
    return this.#dropRequests.some(
      (r) => r.student.id === sId && r.course.code === code && r.isPending(),
    );
  }

  hasCompleted(sId, code) {
    return this.#enrollments.some(
      (e) => e.student.id === sId && e.course.code === code && e.grade,
    );
  }

  getStudentEnrollments(sId) {
    return this.#enrollments.filter(
      (e) => e.student.id === sId && e.isActive() && !e.grade,
    );
  }

  getStudentDropRequests(sId) {
    return this.#dropRequests.filter((r) => r.student.id === sId);
  }

  getTotalUnits(sId) {
    return this.getStudentEnrollments(sId).reduce(
      (s, e) => s + e.course.units,
      0,
    );
  }

  // Returns codes of all courses student has ever enrolled in (for prereq checking)
  getPassedCodes(sId) {
    return this.#enrollments
      .filter(
        (e) =>
          e.student.id === sId &&
          e.grade &&
          !["5.00", "INC", "DRP"].includes(e.grade),
      )
      .map((e) => e.course.code);
  }

  // All enrollments for a student (including past, for grades view)
  getStudentGrades(sId) {
    return this.#enrollments.filter((e) => e.student.id === sId);
  }

  postGrade(studentId, courseCode, grade) {
    const enrollment = this.#enrollments.find(
      (e) => e.student.id === studentId && e.course.code === courseCode,
    );
    if (!enrollment)
      return { success: false, message: "Enrollment not found." };
    try {
      enrollment.setGrade(grade);
      return {
        success: true,
        message: `Grade ${grade} posted for ${enrollment.student.name} in ${enrollment.course.title}.`,
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  /* ── Auth ── */
  authenticate(username, password, role) {
    if (role === "student")
      return (
        this.#students.find(
          (s) =>
            (s.username === username || s.id === username) &&
            s.authenticate(password),
        ) || null
      );
    return (
      this.#faculty.find(
        (f) =>
          (f.username === username || f.id === username) &&
          f.authenticate(password),
      ) || null
    );
  }

  /* ── Enroll ── */
  enroll(sId, code) {
    const student = this.#findStudentById(sId);
    if (!student) return { success: false, message: "Student not found." };
    const course = this.#findCourseByCode(code);
    if (!course) return { success: false, message: "Course not found." };
    if (this.isEnrolled(sId, code))
      return {
        success: false,
        message: `Already enrolled in ${course.title}.`,
      };
    const cnt = this.getEnrolledCount(code);
    if (!course.hasSlot(cnt))
      return {
        success: false,
        message: `${course.title} is full (${cnt}/${course.capacity}).`,
      };
    const passed = this.getPassedCodes(sId);
    const chk = course.checkPrerequisites(passed);
    if (!chk.met)
      return {
        success: false,
        message: `Missing prerequisites: ${chk.missing.join(", ")}.`,
      };
    const en = new Enrollment({
      id: genId("E"),
      student,
      course,
      status: "enrolled",
      date: new Date().toISOString().split("T")[0],
      grade: null,
    });
    this.#enrollments.push(en);
    return {
      success: true,
      message: `Successfully enrolled in ${course.title}.`,
      enrollment: en,
    };
  }

  /* ── Drop ── */
  requestDrop(sId, code, reason) {
    if (!reason?.trim())
      return { success: false, message: "Please provide a reason." };
    if (!this.isEnrolled(sId, code))
      return { success: false, message: "Not enrolled in this course." };
    if (this.hasPendingDropRequest(sId, code))
      return { success: false, message: "A drop request is already pending." };
    const enrollment = this.#enrollments.find(
      (e) => e.student.id === sId && e.course.code === code && e.isActive(),
    );
    const dr = new DropRequest({
      id: genId("DR"),
      enrollment,
      reason: reason.trim(),
      status: "pending",
      date: new Date().toISOString().split("T")[0],
    });
    this.#dropRequests.push(dr);
    return {
      success: true,
      message: `Drop request submitted for ${enrollment.course.title}.`,
    };
  }

  approveDropRequest(id) {
    const r = this.#findDropReqById(id);
    if (!r) return { success: false, message: "Request not found." };
    if (!r.isPending()) return { success: false, message: "Already resolved." };
    r.approve();
    return {
      success: true,
      message: `Approved: ${r.student.name} — ${r.course.title}.`,
    };
  }

  rejectDropRequest(id, note) {
    const r = this.#findDropReqById(id);
    if (!r) return { success: false, message: "Request not found." };
    if (!r.isPending()) return { success: false, message: "Already resolved." };
    r.reject(note);
    return { success: true, message: "Drop request rejected." };
  }
}

export default EnrollmentSystem;

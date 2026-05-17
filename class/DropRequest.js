import Enrollment from "./Enrollment.js";

class DropRequest {
  #id;
  #enrollment;
  #reason;
  #status;
  #date;
  #facultyNote;

  constructor({ id, enrollment, reason, status, date, facultyNote }) {
    // BUG FIX: original referenced Enrollment without importing it
    if (!(enrollment instanceof Enrollment))
      throw new TypeError("Need Enrollment instance");
    this.#id = id;
    this.#enrollment = enrollment;
    this.#reason = reason;
    this.#status = status || "pending";
    this.#date = date || new Date().toISOString().split("T")[0];
    this.#facultyNote = facultyNote || "";
  }

  get id() {
    return this.#id;
  }
  get enrollment() {
    return this.#enrollment;
  }
  get student() {
    return this.#enrollment.student;
  }
  get course() {
    return this.#enrollment.course;
  }
  get reason() {
    return this.#reason;
  }
  get status() {
    return this.#status;
  }
  get date() {
    return this.#date;
  }
  get facultyNote() {
    return this.#facultyNote;
  }

  isPending() {
    return this.#status === "pending";
  }

  approve() {
    if (!this.isPending()) throw new Error("Drop request already resolved");
    this.#status = "approved";
    this.#enrollment.drop();
  }

  reject(note = "") {
    if (!this.isPending()) throw new Error("Drop request already resolved");
    this.#status = "rejected";
    this.#facultyNote = note.trim();
  }

  toJSON() {
    return {
      id: this.#id,
      studentId: this.student.id,
      courseCode: this.course.code, // BUG FIX: original used 'subjectCode'
      reason: this.#reason,
      status: this.#status,
      date: this.#date,
      facultyNote: this.#facultyNote,
    };
  }
}

export default DropRequest;

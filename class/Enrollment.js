import Student from "./Student.js";
import Course from "./Course.js";

class Enrollment {
  #id;
  #student;
  #course;
  #status;
  #date;
  #grade;
  #academicYear;
  #semester;

  constructor({
    id,
    student,
    course,
    status,
    date,
    grade = null,
    academicYear = null,
    semester = null,
  }) {
    if (!(student instanceof Student))
      throw new TypeError("Need Student instance");
    if (!(course instanceof Course))
      throw new TypeError("Need Course instance");
    this.#id = id;
    this.#student = student;
    this.#course = course;
    this.#status = status || "enrolled";
    this.#date = date || new Date().toISOString().split("T")[0];
    this.#grade = grade;
    this.#academicYear = academicYear || currentAY();
    this.#semester = semester || course.semester || 1;
  }

  get id() {
    return this.#id;
  }
  get student() {
    return this.#student;
  }
  get course() {
    return this.#course;
  }
  get status() {
    return this.#status;
  }
  get date() {
    return this.#date;
  }
  get grade() {
    return this.#grade;
  }
  get academicYear() {
    return this.#academicYear;
  }
  get semester() {
    return this.#semester;
  }

  isActive() {
    return this.#status === "enrolled";
  }

  drop() {
    if (!this.isActive()) throw new Error("Enrollment is not active");
    this.#status = "dropped";
  }

  setGrade(grade) {
    const valid = [
      "1.00",
      "1.25",
      "1.50",
      "1.75",
      "2.00",
      "2.25",
      "2.50",
      "2.75",
      "3.00",
      "4.00",
      "5.00",
      "INC",
      "DRP",
    ];
    if (!valid.includes(String(grade)))
      throw new Error(`Invalid grade: ${grade}`);
    this.#grade = String(grade);
    if (this.#status === "enrolled") {
      this.#status = "completed";
    }
  }

  toJSON() {
    return {
      id: this.#id,
      studentId: this.#student.id,
      courseCode: this.#course.code,
      status: this.#status,
      date: this.#date,
      grade: this.#grade,
      academicYear: this.#academicYear,
      semester: this.#semester,
    };
  }
}

function currentAY() {
  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export default Enrollment;

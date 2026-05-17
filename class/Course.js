class Course {
  #code; #title; #units; #capacity; #schedule; #prerequisites;
  #yearLevel; #semester; #facultyId;

  constructor({ code, title, units, capacity, schedule, prerequisites = [],
                yearLevel = 1, semester = 1, facultyId = null }) {
    this.#code          = code;
    this.#title         = title;
    this.#units         = units;
    this.#capacity      = capacity;
    this.#schedule      = schedule;
    this.#prerequisites = [...prerequisites];
    this.#yearLevel     = yearLevel;
    this.#semester      = semester;
    this.#facultyId     = facultyId;
  }

  get code()          { return this.#code; }
  get title()         { return this.#title; }
  get units()         { return this.#units; }
  get capacity()      { return this.#capacity; }
  get schedule()      { return this.#schedule; }
  get prerequisites() { return [...this.#prerequisites]; }
  get yearLevel()     { return this.#yearLevel; }
  get semester()      { return this.#semester; }
  get facultyId()     { return this.#facultyId; }

  hasSlot(n)           { return n < this.#capacity; }
  getAvailableSlots(n) { return Math.max(0, this.#capacity - n); }
  hasPrerequisites()   { return this.#prerequisites.length > 0; }

  checkPrerequisites(passedCodes) {
    const missing = this.#prerequisites.filter(p => !passedCodes.includes(p));
    return { met: missing.length === 0, missing };
  }

  toJSON() {
    return {
      code: this.#code, title: this.#title, units: this.#units,
      capacity: this.#capacity, schedule: this.#schedule,
      prerequisites: [...this.#prerequisites],
      yearLevel: this.#yearLevel, semester: this.#semester,
      facultyId: this.#facultyId,
    };
  }
}

export default Course;

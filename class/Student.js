class Student {
  #id;
  #name;
  #username;
  #password;
  #program;
  #yearLevel;
  #email;

  constructor({ id, name, username, password, program, yearLevel, email }) {
    this.#id = id;
    this.#name = name;
    this.#username = username;
    this.#password = password;
    this.#program = program || "";
    this.#yearLevel = yearLevel || 1;
    this.#email = email || "";
  }

  get id() {
    return this.#id;
  }
  get name() {
    return this.#name;
  }
  get username() {
    return this.#username;
  }
  get program() {
    return this.#program;
  }
  // keep .course alias so old controller refs don't break
  get course() {
    return this.#program;
  }
  get yearLevel() {
    return this.#yearLevel;
  }
  get year() {
    return this.#yearLevel;
  }
  get email() {
    return this.#email;
  }
  get role() {
    return "student";
  }

  authenticate(p) {
    return this.#password === p;
  }

  getInitials() {
    return this.#name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  toJSON() {
    return {
      id: this.#id,
      name: this.#name,
      username: this.#username,
      password: this.#password,
      program: this.#program,
      yearLevel: this.#yearLevel,
      email: this.#email,
      role: this.role,
    };
  }
}

export default Student;

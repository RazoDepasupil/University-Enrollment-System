class Faculty {
  #id;
  #name;
  #username;
  #password;
  #dept;

  // BUG FIX: original constructor param was 'dept' but data.json uses 'department'
  constructor({ id, name, username, password, department, dept }) {
    this.#id = id;
    this.#name = name;
    this.#username = username;
    this.#password = password;
    this.#dept = department ?? dept ?? "";
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
  get dept() {
    return this.#dept;
  }
  get role() {
    return "faculty";
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
      department: this.#dept,
      role: this.role,
    };
  }
}

export default Faculty;

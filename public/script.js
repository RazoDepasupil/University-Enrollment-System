"use strict";

/* ══════════════════════════════════════
   STATE
══════════════════════════════════════ */
let token = null;
let currentUser = null;
let dropTargetCode = null;
let rejectTargetId = null;

/* ══════════════════════════════════════
   API HELPERS
══════════════════════════════════════ */
async function api(method, path, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (token) opts.headers["Authorization"] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch("/api" + path, opts);
  } catch (networkErr) {
    throw new Error("Network error — is the server running?");
  }

  // Safely parse the body: it may be empty (e.g. server crash) or HTML (Express default 404/500)
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // Server returned non-JSON (HTML error page, etc.)
    throw new Error(`Server error (${res.status}): unexpected response format`);
  }

  if (!res.ok)
    throw new Error(
      data.error || data.message || `Request failed (${res.status})`,
    );
  return data;
}

const get = (path) => api("GET", path);
const post = (path, body) => api("POST", path, body);
const patch = (path, body) => api("PATCH", path, body);

/* ══════════════════════════════════════
   UTILITIES
══════════════════════════════════════ */
function fmtDate(d) {
  return d
    ? new Date(d).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
}

function toast(msg, type = "success") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${msg}</span>`;
  document.getElementById("toasts").prepend(el);
  setTimeout(() => el.remove(), 3500);
}

/* ══════════════════════════════════════
   AUTH
══════════════════════════════════════ */
function applySession(savedToken, savedUser) {
  token = savedToken;
  currentUser = savedUser;

  document.getElementById("login-page").style.display = "none";
  document.getElementById("topbar").classList.remove("hidden");
  document.getElementById("top-avatar").textContent = currentUser.initials;
  document.getElementById("top-name").textContent = currentUser.name;

  if (currentUser.role === "student") {
    document.getElementById("student-app").classList.add("active");
    renderStudentCourses();
  } else {
    document.getElementById("faculty-app").classList.add("active");
    renderFacultyPending();
    renderFacultyAllReq();
    renderFacultyRoster();
  }
}

async function doLogin() {
  const username = document.getElementById("login-user").value.trim();
  const password = document.getElementById("login-pass").value;
  const errEl = document.getElementById("login-err");

  if (!username || !password) {
    errEl.textContent = "Please enter your ID/username and password.";
    return;
  }
  errEl.textContent = "";

  try {
    const data = await post("/auth/login", { username, password });
    localStorage.setItem("ep_token", data.token);
    localStorage.setItem("ep_user", JSON.stringify(data.user));
    applySession(data.token, data.user);
  } catch (err) {
    errEl.textContent = err.message;
  }
}

function doLogout() {
  token = null;
  currentUser = null;
  localStorage.removeItem("ep_token");
  localStorage.removeItem("ep_user");
  document.getElementById("login-page").style.display = "";
  document.getElementById("topbar").classList.add("hidden");
  document.getElementById("student-app").classList.remove("active");
  document.getElementById("faculty-app").classList.remove("active");
  document.getElementById("login-user").value = "";
  document.getElementById("login-pass").value = "";
  // reset student tabs
  showStudentTab("courses", document.querySelector("#student-app .nav-tab"));
}

document.getElementById("login-pass").addEventListener("keydown", (e) => {
  if (e.key === "Enter") doLogin();
});

/* ══════════════════════════════════════
   TABS
══════════════════════════════════════ */
function showStudentTab(name, btn) {
  ["courses", "enrolled", "grades", "requests", "profile"].forEach((t) =>
    document.getElementById("tab-" + t).classList.add("hidden"),
  );
  document.getElementById("tab-" + name).classList.remove("hidden");
  document
    .querySelectorAll("#student-app .nav-tab")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  if (name === "enrolled") renderEnrolled();
  if (name === "grades") renderGrades();
  if (name === "requests") renderDropRequests();
  if (name === "profile") renderProfile();
}

function showFacultyTab(name, btn) {
  ["pending", "all-req", "fac-grades", "fac-courses"].forEach((t) =>
    document.getElementById("tab-" + t).classList.add("hidden"),
  );
  document.getElementById("tab-" + name).classList.remove("hidden");
  document
    .querySelectorAll("#faculty-app .nav-tab")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  if (name === "fac-grades") renderFacultyGrades();
  if (name === "fac-courses") renderFacultyRoster();
}

/* ══════════════════════════════════════
   STUDENT — COURSE GRID
══════════════════════════════════════ */
let cachedCourses = [];

async function renderStudentCourses(filter = "") {
  const grid = document.getElementById("course-grid");
  grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">⏳</div><p>Loading courses…</p></div>`;

  if (!token) {
    const message = "Please sign in to load courses.";
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><p>${message}</p></div>`;
    toast(message, "error");
    return;
  }

  try {
    cachedCourses = await get("/courses");
  } catch (err) {
    const message = err.message || "Failed to load courses.";
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><p>${message}</p></div>`;
    toast(message, "error");
    return;
  }

  filterCourses(filter);
}

function filterCourses(val = "") {
  const grid = document.getElementById("course-grid");
  const q = val.toLowerCase();
  const courses = cachedCourses.filter(
    (c) =>
      c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q),
  );

  document.getElementById("course-count").textContent =
    `${courses.length} subject${courses.length !== 1 ? "s" : ""}`;

  if (!courses.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">📚</div><p>No courses match your search.</p></div>`;
    return;
  }

  grid.innerHTML = courses
    .map((c) => {
      const pct = Math.round((c.enrolledCount / c.capacity) * 100);
      const fillClass = pct >= 100 ? "full" : pct >= 80 ? "warn" : "";
      const slots = c.availableSlots;

      let enrollBtn;
      if (c.isEnrolled) {
        enrollBtn = `<button class="btn-enroll enrolled" disabled>✓ Enrolled</button>`;
      } else if (c.hasCompleted) {
        enrollBtn = `<button class="btn-enroll completed" disabled>Completed</button>`;
      } else if (c.isFull) {
        enrollBtn = `<button class="btn-enroll full" disabled>Full (${c.enrolledCount}/${c.capacity})</button>`;
      } else if (!c.prereqMet) {
        enrollBtn = `<button class="btn-enroll prereq-fail" disabled title="Missing: ${c.missingPrereqs.join(", ")}">Missing prereqs</button>`;
      } else {
        enrollBtn = `<button class="btn-enroll can" onclick="doEnroll('${c.code}')">Enroll</button>`;
      }

      const dropBtn = c.isEnrolled
        ? `<button class="btn-drop-req" onclick="openDropModal('${c.code}')" ${c.hasPendingDrop ? "disabled title='Drop pending'" : ""}>Drop</button>`
        : "";

      return `<div class="course-card">
      <div class="course-code">${c.code}</div>
      <div class="course-title">${c.title}</div>
      <div class="course-meta">
        <span>📅 ${c.schedule}</span>
        <span>📘 ${c.units} units</span>
      </div>
      ${c.hasPrerequisites ? `<div class="prereq-badge">⚠ Prereqs: ${c.prerequisites.join(", ")}</div>` : ""}
      <div style="font-size:.75rem;color:var(--muted);margin-top:2px;">
        ${slots > 0 ? `${slots} slot${slots !== 1 ? "s" : ""} left` : "No slots"} · ${c.enrolledCount}/${c.capacity} enrolled
      </div>
      <div class="capacity-bar"><div class="capacity-fill ${fillClass}" style="width:${Math.min(pct, 100)}%"></div></div>
      <div class="course-actions">${enrollBtn}${dropBtn}</div>
    </div>`;
    })
    .join("");
}

async function doEnroll(code) {
  try {
    const res = await post("/enrollments", { courseCode: code });
    toast(res.message, "success");
    await renderStudentCourses();
  } catch (err) {
    toast(err.message, "error");
  }
}

/* ══════════════════════════════════════
   STUDENT — MY ENROLLMENTS
══════════════════════════════════════ */
async function renderEnrolled() {
  const tbody = document.getElementById("enrolled-tbody");
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem">Loading…</td></tr>`;

  try {
    const data = await get("/enrollments");
    document.getElementById("st-count").textContent = data.enrollments.length;
    document.getElementById("st-units").textContent = data.totalUnits;
    document.getElementById("st-drops").textContent = data.pendingDrops;

    if (!data.enrollments.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty"><div class="empty-icon">📋</div><p>No active enrollments. Browse courses to enroll.</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = data.enrollments
      .map(
        (e) => `
      <tr>
        <td><strong style="font-weight:500">${e.courseCode}</strong><br><span style="font-size:.8rem;color:var(--muted)">${e.courseTitle}</span></td>
        <td style="font-size:.85rem;color:var(--muted)">${e.schedule}</td>
        <td>${e.units}</td>
        <td><span class="badge badge-green">Enrolled</span></td>
        <td style="font-size:.85rem;color:var(--muted)">${fmtDate(e.date)}</td>
        <td>
          <button class="btn-drop-req" onclick="openDropModal('${e.courseCode}')"
            ${e.hasPendingDrop ? "disabled title='Pending'" : ""}
            style="font-size:.8rem;padding:5px 10px">Drop</button>
        </td>
      </tr>`,
      )
      .join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--red)">${err.message}</td></tr>`;
  }
}

/* ══════════════════════════════════════
   STUDENT — DROP REQUESTS
══════════════════════════════════════ */
async function renderDropRequests() {
  const el = document.getElementById("drop-req-list");
  el.innerHTML = `<div class="empty"><div class="empty-icon">⏳</div><p>Loading…</p></div>`;

  try {
    const reqs = await get("/drop-requests");
    if (!reqs.length) {
      el.innerHTML = `<div class="empty"><div class="empty-icon">📤</div><p>No drop requests submitted.</p></div>`;
      return;
    }
    el.innerHTML = reqs
      .map((r) => {
        const badgeCls =
          r.status === "approved"
            ? "badge-green"
            : r.status === "rejected"
              ? "badge-red"
              : "badge-amber";
        return `<div class="req-card">
        <div class="req-header">
          <div>
            <strong style="font-size:.95rem">${r.courseCode} — ${r.courseTitle}</strong>
            <div style="font-size:.8rem;color:var(--muted)">Submitted: ${fmtDate(r.date)}</div>
          </div>
          <span class="badge ${badgeCls}" style="margin-left:auto">${r.status}</span>
        </div>
        <div class="req-body">
          <strong>Reason:</strong> ${r.reason}
          ${r.facultyNote ? `<br><strong>Faculty note:</strong> ${r.facultyNote}` : ""}
        </div>
      </div>`;
      })
      .join("");
  } catch (err) {
    el.innerHTML = `<div class="empty"><p style="color:var(--red)">${err.message}</p></div>`;
  }
}

/* ══════════════════════════════════════
   STUDENT — PROFILE
══════════════════════════════════════ */
async function renderProfile() {
  const el = document.getElementById("profile-content");
  el.innerHTML = `<div class="empty"><div class="empty-icon">⏳</div><p>Loading…</p></div>`;
  try {
    const s = await get("/profile");
    el.innerHTML = `
      <div class="profile-header">
        <div class="avatar avatar-lg avatar-green">${s.initials}</div>
        <div>
          <div style="font-size:1.1rem;font-weight:600">${s.name}</div>
          <div style="font-size:.85rem;color:var(--muted)">${s.program} · Year ${s.yearLevel}</div>
        </div>
      </div>
      <table style="width:100%;font-size:.9rem;border-collapse:collapse;">
        <tr style="border-top:1px solid var(--border)"><td style="padding:10px 0;color:var(--muted);width:140px">Student ID</td><td style="padding:10px 0;font-weight:600;font-family:monospace;font-size:.95rem">${s.id}</td></tr>
        <tr style="border-top:1px solid var(--border)"><td style="padding:10px 0;color:var(--muted)">Username</td><td style="padding:10px 0">${s.username}</td></tr>
        <tr style="border-top:1px solid var(--border)"><td style="padding:10px 0;color:var(--muted)">Email</td><td style="padding:10px 0">${s.email || "—"}</td></tr>
        <tr style="border-top:1px solid var(--border)"><td style="padding:10px 0;color:var(--muted)">Program</td><td style="padding:10px 0">${s.program}</td></tr>
        <tr style="border-top:1px solid var(--border)"><td style="padding:10px 0;color:var(--muted)">Year Level</td><td style="padding:10px 0">Year ${s.yearLevel}</td></tr>
        <tr style="border-top:1px solid var(--border)"><td style="padding:10px 0;color:var(--muted)">Active Units</td><td style="padding:10px 0;font-weight:600">${s.totalUnits} units</td></tr>
      </table>`;
  } catch (err) {
    el.innerHTML = `<p style="color:var(--red);padding:1rem">${err.message}</p>`;
  }
}

/* ══════════════════════════════════════
   DROP MODAL
══════════════════════════════════════ */
function openDropModal(code) {
  dropTargetCode = code;
  const c = cachedCourses.find((x) => x.code === code);
  document.getElementById("drop-modal-sub").textContent = c
    ? `${c.code} — ${c.title}`
    : code;
  document.getElementById("drop-reason").value = "";
  document.getElementById("modal-drop").classList.add("open");
}

async function submitDrop() {
  const reason = document.getElementById("drop-reason").value;
  try {
    const res = await post("/drop-requests", {
      courseCode: dropTargetCode,
      reason,
    });
    toast(res.message, "success");
    closeModal("modal-drop");
    await renderStudentCourses();
    await renderEnrolled();
  } catch (err) {
    toast(err.message, "error");
  }
}

/* ══════════════════════════════════════
   FACULTY — PENDING
══════════════════════════════════════ */
async function renderFacultyPending() {
  const el = document.getElementById("pending-list");
  const badge = document.getElementById("pending-badge");

  try {
    const reqs = (await get("/drop-requests")).filter((r) => r.isPending);
    badge.textContent = reqs.length || "";

    if (!reqs.length) {
      el.innerHTML = `<div class="empty"><div class="empty-icon">✅</div><p>No pending drop requests.</p></div>`;
      return;
    }

    el.innerHTML = reqs
      .map(
        (r) => `
      <div class="req-card">
        <div class="req-header">
          <div class="avatar avatar-sm avatar-gold">${r.studentInitials}</div>
          <div>
            <strong style="font-size:.95rem">${r.studentName}</strong>
            <div style="font-size:.8rem;color:var(--muted)">${r.studentId} · ${r.studentCourse}</div>
          </div>
          <span class="badge badge-amber" style="margin-left:auto">Pending</span>
        </div>
        <div class="req-body">
          <strong>Course:</strong> ${r.courseCode} — ${r.courseTitle} (${r.courseUnits} units)<br>
          <strong>Reason:</strong> ${r.reason}<br>
          <strong>Submitted:</strong> ${fmtDate(r.date)}
        </div>
        <div class="req-actions">
          <button class="btn-sm approve" onclick="doApprove('${r.id}')">Approve</button>
          <button class="btn-sm reject"  onclick="openRejectModal('${r.id}', '${r.studentName.replace(/'/g, "\\'")}', '${r.courseTitle.replace(/'/g, "\\'")}')">Reject</button>
        </div>
      </div>`,
      )
      .join("");
  } catch (err) {
    el.innerHTML = `<div class="empty"><p style="color:var(--red)">${err.message}</p></div>`;
  }
}

async function doApprove(id) {
  try {
    const res = await patch(`/drop-requests/${id}`, { action: "approve" });
    toast(res.message, "success");
    await renderFacultyPending();
    await renderFacultyAllReq();
    await renderFacultyRoster();
  } catch (err) {
    toast(err.message, "error");
  }
}

function openRejectModal(id, studentName, courseTitle) {
  rejectTargetId = id;
  document.getElementById("reject-modal-sub").textContent =
    `${studentName} — ${courseTitle}`;
  document.getElementById("reject-note").value = "";
  document.getElementById("modal-reject").classList.add("open");
}

async function confirmReject() {
  const note = document.getElementById("reject-note").value;
  try {
    const res = await patch(`/drop-requests/${rejectTargetId}`, {
      action: "reject",
      note,
    });
    toast(res.message, "info");
    closeModal("modal-reject");
    await renderFacultyPending();
    await renderFacultyAllReq();
  } catch (err) {
    toast(err.message, "error");
  }
}

/* ══════════════════════════════════════
   FACULTY — ALL REQUESTS
══════════════════════════════════════ */
async function renderFacultyAllReq() {
  const tbody = document.getElementById("all-req-tbody");
  try {
    const reqs = await get("/drop-requests");
    if (!reqs.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty"><p>No drop requests yet.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = reqs
      .map((r) => {
        const badgeCls =
          r.status === "approved"
            ? "badge-green"
            : r.status === "rejected"
              ? "badge-red"
              : "badge-amber";
        return `<tr>
        <td>${r.studentName}<br><span style="font-size:.78rem;color:var(--muted)">${r.studentId}</span></td>
        <td style="font-size:.88rem">${r.courseCode}<br><span style="color:var(--muted);font-size:.78rem">${r.courseTitle}</span></td>
        <td style="font-size:.82rem;max-width:180px">${r.reason}</td>
        <td style="font-size:.82rem;color:var(--muted)">${fmtDate(r.date)}</td>
        <td><span class="badge ${badgeCls}">${r.status}</span></td>
        <td style="font-size:.82rem;color:var(--muted)">${r.facultyNote || "—"}</td>
      </tr>`;
      })
      .join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--red);text-align:center">${err.message}</td></tr>`;
  }
}

/* ══════════════════════════════════════
   FACULTY — COURSE ROSTER
══════════════════════════════════════ */
async function renderFacultyRoster() {
  const el = document.getElementById("fac-course-list");
  try {
    const roster = await get("/roster");
    el.innerHTML = roster
      .map((c) => {
        const pct = Math.round((c.enrolledCount / c.capacity) * 100);
        const fillClass = pct >= 100 ? "full" : pct >= 80 ? "warn" : "";
        return `<div class="card" style="margin-bottom:.75rem">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">
          <div>
            <span class="course-code">${c.code}</span>
            <strong style="margin-left:8px;font-size:.97rem">${c.title}</strong>
            <span style="font-size:.82rem;color:var(--muted);margin-left:8px">${c.schedule}</span>
          </div>
          <span style="font-size:.85rem;color:var(--muted)">${c.enrolledCount}/${c.capacity} enrolled</span>
        </div>
        <div class="capacity-bar" style="margin-bottom:10px">
          <div class="capacity-fill ${fillClass}" style="width:${Math.min(pct, 100)}%"></div>
        </div>
        ${
          c.students.length
            ? `<div class="tbl-wrap"><table>
              <thead><tr><th>Student</th><th>ID</th><th>Date</th></tr></thead>
              <tbody>${c.students
                .map(
                  (s) =>
                    `<tr>
                  <td>${s.name}</td>
                  <td style="color:var(--muted);font-size:.85rem">${s.id}</td>
                  <td style="font-size:.82rem;color:var(--muted)">${fmtDate(s.date)}</td>
                </tr>`,
                )
                .join("")}
              </tbody>
            </table></div>`
            : `<p style="font-size:.85rem;color:var(--hint);text-align:center;padding:.5rem 0">No students enrolled</p>`
        }
      </div>`;
      })
      .join("");
  } catch (err) {
    el.innerHTML = `<p style="color:var(--red);padding:1rem">${err.message}</p>`;
  }
}

function closeModal(id, event) {
  if (event && event.target !== document.getElementById(id)) return;
  document.getElementById(id).classList.remove("open");
}

/* ══════════════════════════════════════
   STUDENT — GRADES (grouped by AY + Semester)
══════════════════════════════════════ */
async function renderGrades() {
  const container = document.getElementById("grades-container");
  container.innerHTML = `<div class="empty"><div class="empty-icon">⏳</div><p>Loading grades…</p></div>`;

  try {
    const data = await get("/grades");
    const { periods, gwa, gradedCount, pendingCount } = data;

    document.getElementById("st-gwa").textContent = gwa
      ? parseFloat(gwa).toFixed(2)
      : "—";
    document.getElementById("st-graded").textContent = gradedCount;
    document.getElementById("st-pending-grades").textContent = pendingCount;

    if (!periods.length) {
      container.innerHTML = `<div class="empty"><div class="empty-icon">📋</div><p>No grade records found.</p></div>`;
      return;
    }

    const SEM = { 1: "First Semester", 2: "Second Semester", 3: "Mid-Year" };

    container.innerHTML = periods
      .map((p) => {
        const graded = p.subjects.filter(
          (s) => s.grade && !["INC", "DRP"].includes(s.grade),
        );
        let semGwa = null;
        if (graded.length) {
          const tu = graded.reduce((a, s) => a + s.units, 0);
          const ws = graded.reduce(
            (a, s) => a + parseFloat(s.grade) * s.units,
            0,
          );
          semGwa = (ws / tu).toFixed(2);
        }

        const rows = p.subjects
          .map((s) => {
            const gd = s.grade
              ? `<span class="badge ${gradeColor(s.grade)}">${s.grade}</span>`
              : `<span style="color:var(--muted);font-size:.82rem">—</span>`;
            return `<tr>
          <td><strong style="font-weight:500;font-size:.9rem">${s.courseCode}</strong><br>
            <span style="font-size:.78rem;color:var(--muted)">${s.courseTitle}</span></td>
          <td style="text-align:center">${s.units}</td>
          <td>${gd}</td>
          <td style="font-size:.8rem;color:var(--muted)">${gradeRemarks(s.grade)}</td>
        </tr>`;
          })
          .join("");

        return `<div class="card" style="margin-bottom:1rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;flex-wrap:wrap;gap:.5rem">
          <div style="font-weight:600;font-size:.97rem">A.Y. ${p.academicYear} &nbsp;·&nbsp; ${SEM[p.semester] || "Semester " + p.semester}</div>
          ${semGwa ? `<div style="font-size:.82rem;color:var(--muted)">Semester GWA: <strong style="color:var(--text)">${semGwa}</strong></div>` : ""}
        </div>
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Course</th><th style="text-align:center">Units</th><th>Grade</th><th>Remarks</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
      })
      .join("");
  } catch (err) {
    container.innerHTML = `<div class="empty"><p style="color:var(--red)">${err.message}</p></div>`;
  }
}

function gradeColor(grade) {
  if (!grade) return "";
  if (grade === "INC") return "badge-amber";
  if (grade === "DRP") return "badge-red";
  const n = parseFloat(grade);
  if (n <= 1.75) return "badge-green";
  if (n <= 2.75) return "badge-amber";
  return "badge-red";
}

function gradeRemarks(grade) {
  if (!grade) return "—";
  if (grade === "INC") return "Incomplete";
  if (grade === "DRP") return "Dropped";
  const n = parseFloat(grade);
  if (n === 1.0) return "Excellent";
  if (n <= 1.25) return "Superior";
  if (n <= 1.5) return "Very Good";
  if (n <= 1.75) return "Good";
  if (n <= 2.0) return "Satisfactory";
  if (n <= 2.5) return "Average";
  if (n <= 2.75) return "Below Average";
  if (n <= 3.0) return "Passing";
  if (n === 4.0) return "Conditional";
  return "Failed";
}

/* ══════════════════════════════════════
   FACULTY — POST GRADES
══════════════════════════════════════ */
let allGradeRows = [];
const GRADE_OPTIONS = [
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

async function renderFacultyGrades() {
  const tbody = document.getElementById("fac-grades-tbody");
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:2rem">Loading…</td></tr>`;

  try {
    allGradeRows = await get("/grades/all");

    // Populate course filter dropdown
    const courseSelect = document.getElementById("grade-filter-course");
    const existingCodes = new Set(
      [...courseSelect.options].map((o) => o.value).filter(Boolean),
    );
    const newCodes = [...new Set(allGradeRows.map((r) => r.courseCode))];
    newCodes.forEach((code) => {
      if (!existingCodes.has(code)) {
        const opt = document.createElement("option");
        opt.value = code;
        const row = allGradeRows.find((r) => r.courseCode === code);
        opt.textContent = `${code} — ${row.courseTitle}`;
        courseSelect.appendChild(opt);
      }
    });

    filterGradeTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--red)">${err.message}</td></tr>`;
  }
}

function filterGradeTable() {
  const courseFilter = document.getElementById("grade-filter-course").value;
  const studentFilter = document
    .getElementById("grade-filter-student")
    .value.toLowerCase();
  const tbody = document.getElementById("fac-grades-tbody");

  const filtered = allGradeRows.filter((r) => {
    const matchCourse = !courseFilter || r.courseCode === courseFilter;
    const matchStudent =
      !studentFilter ||
      r.studentName.toLowerCase().includes(studentFilter) ||
      r.studentId.toLowerCase().includes(studentFilter);
    return matchCourse && matchStudent;
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty"><p>No records match your filter.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((r) => {
      const gradeDisplay = r.grade
        ? `<span class="badge ${gradeColor(r.grade)}">${r.grade}</span>`
        : `<span style="color:var(--muted);font-size:.82rem">—</span>`;

      let actionCell = `<button class="btn-sm approve"
            onclick="submitGrade('${r.studentId}','${r.courseCode}')">
            Post
          </button>`;

      if (r.grade) {
        actionCell = `<span style="font-size:.85rem;color:var(--muted);font-weight:600">Already posted</span>`;
      }

      return `<tr>
      <td>
        <strong style="font-weight:500">${r.studentName}</strong><br>
        <span style="font-size:.78rem;color:var(--muted)">${r.studentId} · ${r.studentProgram}</span>
      </td>
      <td>
        <strong style="font-size:.88rem">${r.courseCode}</strong><br>
        <span style="font-size:.78rem;color:var(--muted)">${r.courseTitle}</span>
      </td>
      <td>${r.units}</td>
      <td>${gradeDisplay}</td>
      <td>
        <div style="display:flex;gap:.4rem;align-items:center">
          ${
            r.grade
              ? ""
              : `<select id="grade-sel-${r.studentId}-${r.courseCode}"
            style="padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:.85rem">
            <option value="">Select…</option>
            ${GRADE_OPTIONS.map((g) => `<option value="${g}">${g}</option>`).join("")}
          </select>`
          }
          ${actionCell}
        </div>
      </td>
    </tr>`;
    })
    .join("");
}

async function submitGrade(studentId, courseCode) {
  const sel = document.getElementById(`grade-sel-${studentId}-${courseCode}`);
  const grade = sel?.value;
  if (!grade) {
    toast("Please select a grade first.", "error");
    return;
  }

  try {
    const res = await post("/grades", { studentId, courseCode, grade });
    toast(res.message, "success");
    await renderFacultyGrades();
  } catch (err) {
    toast(err.message, "error");
  }
}

/* ══════════════════════════════════════
   RESTORE SESSION ON PAGE LOAD
   Must be at the bottom — after all functions are defined
══════════════════════════════════════ */
(function restoreSession() {
  try {
    const savedToken = localStorage.getItem("ep_token");
    const savedUser = JSON.parse(localStorage.getItem("ep_user") || "null");
    if (savedToken && savedUser) applySession(savedToken, savedUser);
  } catch {
    localStorage.removeItem("ep_token");
    localStorage.removeItem("ep_user");
  }
})();

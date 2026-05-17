import Router from "express";
import { facultyOnly, authMiddleware, studentOnly } from "../middlewares/auth.js";
import getRoster from "../controller/rosterController.js";
import getProfile from "../controller/profileController.js";
import {
  getDropRequest,
  postDropRequest,
  updateDropRequest,
} from "../controller/dropRequestController.js";
import login from "../controller/loginController.js";
import {
  enrollCourse,
  getEnrollment,
} from "../controller/enrolllmentController.js";
import { getCourses } from "../controller/courseController.js";
import { getGrades, getAllGrades, postGrade } from "../controller/gradeController.js";

const router = Router();
//LOGIN
router.post("/auth/login", login);

//COURSE
router.get("/courses", authMiddleware, getCourses);

//ENROLLMENT
router.get("/enrollments", authMiddleware, studentOnly, getEnrollment);
router.post("/enrollments", authMiddleware, studentOnly, enrollCourse);

//DROP REQUEST
router.get("/drop-requests", authMiddleware, getDropRequest);
router.post("/drop-requests", authMiddleware, studentOnly, postDropRequest);
router.patch(
  "/drop-requests/:id",
  authMiddleware,
  facultyOnly,
  updateDropRequest,
);


//GRADES
router.get("/grades", authMiddleware, studentOnly, getGrades);
router.get("/grades/all", authMiddleware, facultyOnly, getAllGrades);
router.post("/grades", authMiddleware, facultyOnly, postGrade);

//ROSTER
router.get("/roster", authMiddleware, facultyOnly, getRoster);


//PROFILE
router.get("/profile", authMiddleware, studentOnly, getProfile);

export default router;

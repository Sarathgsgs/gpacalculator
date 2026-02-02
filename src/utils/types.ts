export type Regulation = "2023";

export type Course = {
  regulation: Regulation | string;
  semester: number;
  courseCode: string;
  courseTitle: string;
  credits: number; // can be 1.5 etc
  type: string; // "Theory" | "Lab" | "Core" | "Skill" | "Non-Credit" ...
  isCredit: boolean;
};

export type Grade = "O" | "A+" | "A" | "B+" | "B" | "C" | "U";

export type GradeMap = Record<string /* courseCode */, Grade | null>;

export type CoursesApiResponse = {
  regulation: Regulation | string;
  semester: number;
  courses: Course[];
};

export type GpaResult = {
  gpa: number; // not rounded
  totalCredits: number;
  countedCourses: number; // credit courses included in calc
};

export type SemesterEntry = {
  semester: number; // 1-8 (for display)
  gpa: number; // 0-10
  credits: number; // >= 0
};
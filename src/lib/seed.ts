import { db } from "./db";
import { gradeFor } from "./types";

// Seed demo data for ExamHub. Idempotent — safe to run repeatedly.
export async function seedExamHub() {
  // 1. School
  const school = await db.school.upsert({
    where: { id: "school-nyerere" },
    update: {},
    create: {
      id: "school-nyerere",
      name: "Nyerere Secondary School",
      region: "Dar es Salaam",
      plan: "premium",
    },
  });

  // 2. Users (one per role)
  const users = [
    {
      id: "user-admin",
      name: "David Mbazza",
      email: "admin@examhub.ac.tz",
      role: "super_admin",
      schoolId: null,
    },
    {
      id: "user-school",
      name: "Grace Mushi",
      email: "school@nyerere.ac.tz",
      role: "school_admin",
      schoolId: school.id,
    },
    {
      id: "user-teacher",
      name: "Asha Juma",
      email: "asha@nyerere.ac.tz",
      role: "teacher",
      schoolId: school.id,
    },
    {
      id: "user-student",
      name: "Amina Hassan",
      email: "amina@nyerere.ac.tz",
      role: "student",
      schoolId: school.id,
    },
    {
      id: "user-student2",
      name: "Joseph Komba",
      email: "joseph@nyerere.ac.tz",
      role: "student",
      schoolId: school.id,
    },
  ];

  for (const u of users) {
    await db.user.upsert({
      where: { id: u.id },
      update: {},
      create: u,
    });
  }

  const teacher = await db.user.findUniqueOrThrow({ where: { id: "user-teacher" } });
  const schoolAdmin = await db.user.findUniqueOrThrow({ where: { id: "user-school" } });
  const student = await db.user.findUniqueOrThrow({ where: { id: "user-student" } });

  // 3. Papers — a mix of statuses so the Library isn't empty
  const papers = [
    {
      id: "paper-bio-2023",
      title: "Biology CSEE 2023 Paper 1",
      subject: "Biology",
      level: "form_4",
      year: 2023,
      type: "necta",
      status: "published",
      fileName: "biology-csee-2023-p1.pdf",
      fileSize: 1_842_000,
      description: "Official NECTA CSEE Biology Paper 1, November 2023.",
      uploadedById: teacher.id,
      schoolId: school.id,
    },
    {
      id: "paper-math-2022",
      title: "Mathematics CSEE 2022 Paper 2",
      subject: "Mathematics",
      level: "form_4",
      year: 2022,
      type: "necta",
      status: "published",
      fileName: "math-csee-2022-p2.pdf",
      fileSize: 2_104_500,
      description: "Mathematics Paper 2 — full solutions included.",
      uploadedById: schoolAdmin.id,
      schoolId: school.id,
    },
    {
      id: "paper-chem-mock",
      title: "Chemistry Mock Exam — Term 2",
      subject: "Chemistry",
      level: "form_6",
      year: 2024,
      type: "mock",
      status: "draft",
      fileName: "chem-mock-t2-2024.pdf",
      fileSize: 980_000,
      description: "Internal mock exam. Pending review before publishing to students.",
      uploadedById: teacher.id,
      schoolId: school.id,
    },
    {
      id: "paper-phy-regional",
      title: "Physics Regional Exam 2024",
      subject: "Physics",
      level: "form_4",
      year: 2024,
      type: "regional",
      status: "archived",
      fileName: "physics-regional-2024.pdf",
      fileSize: 1_510_000,
      description: "Archived — superseded by newer version.",
      uploadedById: teacher.id,
      schoolId: school.id,
    },
  ];

  for (const p of papers) {
    await db.paper.upsert({
      where: { id: p.id },
      update: { status: p.status, title: p.title, subject: p.subject, level: p.level, year: p.year, type: p.type, description: p.description, fileName: p.fileName, fileSize: p.fileSize },
      create: p,
    });
  }

  // 4. Exam built from the Biology paper — published, mixed question types
  const examId = "exam-bio-2023";
  const existingExam = await db.exam.findUnique({ where: { id: examId } });
  if (!existingExam) {
    await db.exam.create({
      data: {
        id: examId,
        title: "Biology CSEE 2023 — Practice",
        subject: "Biology",
        level: "form_4",
        durationMins: 60,
        totalMarks: 7,
        status: "published",
        description: "Auto-generated from the uploaded Biology paper. 4 questions across MCQ, True/False, Short answer and Essay.",
        paperId: "paper-bio-2023",
        createdById: teacher.id,
        schoolId: school.id,
        questions: {
          create: [
            {
              type: "mcq",
              text: "Which organelle is the site of photosynthesis?",
              options: JSON.stringify(["Mitochondria", "Chloroplast", "Nucleus", "Ribosome"]),
              correctAnswer: "1",
              explanation: "Chloroplasts contain chlorophyll and carry out photosynthesis.",
              marks: 2,
              difficulty: "easy",
              order: 0,
            },
            {
              type: "truefalse",
              text: "The cell wall is found in both plant and animal cells.",
              options: "[]",
              correctAnswer: "false",
              explanation: "Cell walls are present in plant cells, not animal cells.",
              marks: 1,
              difficulty: "easy",
              order: 1,
            },
            {
              type: "short",
              text: "Name the process by which plants make their own food.",
              options: "[]",
              correctAnswer: "photosynthesis",
              explanation: "Photosynthesis converts light energy into chemical energy.",
              marks: 2,
              difficulty: "medium",
              order: 2,
            },
            {
              type: "essay",
              text: "Explain three adaptations of a leaf for photosynthesis.",
              options: "[]",
              correctAnswer: "Broad flat lamina; thinness; chlorophyll; stomata; arrangement",
              explanation: "Look for: broad lamina, thin leaf, chloroplasts, stomata, network of veins.",
              marks: 2,
              difficulty: "hard",
              order: 3,
            },
          ],
        },
      },
    });
  }

  // 5. A second, smaller published exam (Maths) so students have options
  const examId2 = "exam-math-2022";
  const existingExam2 = await db.exam.findUnique({ where: { id: examId2 } });
  if (!existingExam2) {
    await db.exam.create({
      data: {
        id: examId2,
        title: "Mathematics Quick Quiz",
        subject: "Mathematics",
        level: "form_4",
        durationMins: 20,
        totalMarks: 3,
        status: "published",
        description: "Short 3-question quiz for form 4 revision.",
        paperId: "paper-math-2022",
        createdById: schoolAdmin.id,
        schoolId: school.id,
        questions: {
          create: [
            {
              type: "mcq",
              text: "What is 15% of 200?",
              options: JSON.stringify(["15", "30", "45", "20"]),
              correctAnswer: "1",
              marks: 1,
              difficulty: "easy",
              order: 0,
            },
            {
              type: "mcq",
              text: "Solve: 2x + 5 = 17. x = ?",
              options: JSON.stringify(["4", "6", "8", "11"]),
              correctAnswer: "1",
              marks: 1,
              difficulty: "medium",
              order: 1,
            },
            {
              type: "truefalse",
              text: "A square is a rectangle.",
              options: "[]",
              correctAnswer: "true",
              marks: 1,
              difficulty: "easy",
              order: 2,
            },
          ],
        },
      },
    });
  }

  // 6. A sample submission so the Review tab isn't empty
  const subId = "sub-demo-1";
  const existingSub = await db.submission.findUnique({ where: { id: subId } });
  if (!existingSub) {
    const bioExam = await db.exam.findUniqueOrThrow({
      where: { id: examId },
      include: { questions: true },
    });
    const answersData = [
      { questionOrder: 0, answer: "1" }, // correct (chloroplast)
      { questionOrder: 1, answer: "false" }, // correct
      { questionOrder: 2, answer: "photosynthesis" }, // correct
      { questionOrder: 3, answer: "The leaf is broad and flat to capture sunlight, thin for gas diffusion, and has stomata for gas exchange." }, // essay — needs marking
    ];
    let score = 0;
    let total = 0;
    const answerRows: { questionId: string; answer: string; isCorrect: boolean | null; marksAwarded: number }[] = [];
    for (const q of bioExam.questions) {
      total += q.marks;
      const a = answersData.find((x) => x.questionOrder === q.order);
      if (!a) continue;
      let isCorrect: boolean | null = null;
      let awarded = 0;
      if (q.type === "mcq") {
        isCorrect = a.answer === q.correctAnswer;
        awarded = isCorrect ? q.marks : 0;
      } else if (q.type === "truefalse") {
        isCorrect = a.answer.toLowerCase() === q.correctAnswer.toLowerCase();
        awarded = isCorrect ? q.marks : 0;
      } else if (q.type === "short") {
        isCorrect =
          a.answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
        awarded = isCorrect ? q.marks : 0;
      } else {
        // essay — leave for teacher
        isCorrect = null;
        awarded = 0;
      }
      score += awarded;
      answerRows.push({ questionId: q.id, answer: a.answer, isCorrect, marksAwarded: awarded });
    }
    const pct = total > 0 ? (score / total) * 100 : 0;
    const status = answerRows.some((r) => r.isCorrect === null) ? "auto_marked" : "auto_marked";
    await db.submission.create({
      data: {
        id: subId,
        examId: bioExam.id,
        studentId: student.id,
        score,
        percentage: Math.round(pct * 100) / 100,
        grade: gradeFor(pct),
        status,
        answers: { create: answerRows },
      },
    });
  }

  return { school, users: users.length, papers: papers.length };
}

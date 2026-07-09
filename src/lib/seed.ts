import { supabaseAdmin } from "./supabase-server";
import { gradeFor } from "./types";

export async function seedExamHub() {
  const results: Record<string, unknown> = {};

  // 1. Ensure we have a super_admin user
  const { data: existingAdmin } = await supabaseAdmin
    .from("users")
    .select("id, role")
    .eq("role", "super_admin")
    .limit(1)
    .maybeSingle();

  let adminId: string;
  if (existingAdmin) {
    adminId = existingAdmin.id;
    results.admin = "already exists";
  } else {
    // Create super_admin by updating the first user or inserting new
    const { data: firstUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (firstUser) {
      await supabaseAdmin.from("users").update({ role: "super_admin" }).eq("id", firstUser.id);
      adminId = firstUser.id;
      results.admin = "promoted first user";
    } else {
      const { data: newAdmin } = await supabaseAdmin
        .from("users")
        .insert({ name: "ExamHub Admin", email: "admin@examhub.ac.tz", role: "super_admin" })
        .select("id")
        .single();
      adminId = newAdmin?.id ?? "";
      results.admin = newAdmin ? "created" : "failed";
    }
  }

  // 2. Get or create a teacher
  const { data: teacher } = await supabaseAdmin
    .from("users")
    .select("id, role")
    .neq("role", "student")
    .neq("id", adminId)
    .limit(1)
    .maybeSingle();

  let teacherId = teacher?.id ?? "";
  if (!teacher) {
    const { data: newTeacher } = await supabaseAdmin
      .from("users")
      .insert({ name: "Asha Juma", email: "asha@examhub.ac.tz", role: "teacher" })
      .select("id")
      .single();
    teacherId = newTeacher?.id ?? "";
    results.teacher = newTeacher ? "created" : "failed";
  } else {
    results.teacher = "found existing";
  }

  // 3. Get a student
  const { data: student } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("role", "student")
    .limit(1)
    .maybeSingle();
  const studentId = student?.id ?? "";

  // 4. Create papers
  if (teacherId) {
    const papers = [
      { title: "Biology CSEE 2023 Paper 1", subject: "Biology", level: "form_4", year: 2023, type: "necta", status: "published", file_name: "biology-csee-2023-p1.pdf", file_size: 1842000, description: "Official NECTA CSEE Biology Paper 1, November 2023.", uploaded_by_id: teacherId },
      { title: "Mathematics CSEE 2022 Paper 2", subject: "Mathematics", level: "form_4", year: 2022, type: "necta", status: "published", file_name: "math-csee-2022-p2.pdf", file_size: 2104500, description: "Mathematics Paper 2 — full solutions included.", uploaded_by_id: teacherId },
      { title: "Chemistry Mock Exam — Term 2", subject: "Chemistry", level: "form_6", year: 2024, type: "mock", status: "draft", file_name: "chem-mock-t2-2024.pdf", file_size: 980000, description: "Internal mock exam. Pending review.", uploaded_by_id: teacherId },
      { title: "Physics Regional Exam 2024", subject: "Physics", level: "form_4", year: 2024, type: "regional", status: "archived", file_name: "physics-regional-2024.pdf", file_size: 1510000, description: "Archived — superseded by newer version.", uploaded_by_id: teacherId },
    ];

    let paperCount = 0;
    for (const p of papers) {
      // Check if paper with same title exists
      const { data: existing } = await supabaseAdmin.from("papers").select("id").eq("title", p.title).maybeSingle();
      if (!existing) {
        const { error } = await supabaseAdmin.from("papers").insert(p);
        if (!error) paperCount++;
      } else {
        paperCount++; // already exists
      }
    }
    results.papers = paperCount;
  }

  // 5. Create exams
  if (teacherId) {
    // Get a published paper to link
    const { data: bioPaper } = await supabaseAdmin.from("papers").select("id").eq("subject", "Biology").eq("status", "published").limit(1).maybeSingle();

    // Biology Exam
    const { data: existingBioExam } = await supabaseAdmin.from("exams").select("id").eq("title", "Biology CSEE 2023 — Practice").maybeSingle();
    if (!existingBioExam && bioPaper) {
      const { data: exam, error } = await supabaseAdmin
        .from("exams")
        .insert({
          title: "Biology CSEE 2023 — Practice", subject: "Biology", level: "form_4",
          exam_type: "exam", duration_mins: 60, total_marks: 7, status: "published",
          description: "Practice exam from Biology paper.", paper_id: bioPaper.id,
          created_by_id: teacherId, is_online: true, show_answer_after: true,
        })
        .select("id")
        .single();

      if (exam && !error) {
        await supabaseAdmin.from("questions").insert([
          { exam_id: exam.id, type: "mcq", text: "Which organelle is the site of photosynthesis?", options: JSON.stringify(["Mitochondria", "Chloroplast", "Nucleus", "Ribosome"]), correct_answer: "1", explanation: "Chloroplasts contain chlorophyll.", marks: 2, difficulty: "easy", order: 0 },
          { exam_id: exam.id, type: "truefalse", text: "The cell wall is found in both plant and animal cells.", options: "[]", correct_answer: "false", explanation: "Cell walls are in plant cells only.", marks: 1, difficulty: "easy", order: 1 },
          { exam_id: exam.id, type: "short", text: "Name the process by which plants make their own food.", options: "[]", correct_answer: "photosynthesis", explanation: "Photosynthesis converts light to chemical energy.", marks: 2, difficulty: "medium", order: 2 },
          { exam_id: exam.id, type: "essay", text: "Explain three adaptations of a leaf for photosynthesis.", options: "[]", correct_answer: "Broad flat lamina; thinness; chlorophyll; stomata", explanation: "Look for: broad lamina, thin leaf, chloroplasts, stomata.", marks: 2, difficulty: "hard", order: 3 },
        ]);
        results.exam1 = "created";
      } else {
        results.exam1 = `failed: ${error?.message}`;
      }
    } else {
      results.exam1 = existingBioExam ? "already exists" : "no paper";
    }

    // Math Quiz
    const { data: mathPaper } = await supabaseAdmin.from("papers").select("id").eq("subject", "Mathematics").eq("status", "published").limit(1).maybeSingle();
    const { data: existingMathExam } = await supabaseAdmin.from("exams").select("id").eq("title", "Mathematics Quick Quiz").maybeSingle();
    if (!existingMathExam && mathPaper) {
      const { data: exam2, error } = await supabaseAdmin
        .from("exams")
        .insert({
          title: "Mathematics Quick Quiz", subject: "Mathematics", level: "form_4",
          exam_type: "quiz", duration_mins: 20, total_marks: 3, status: "published",
          description: "Short 3-question quiz.", paper_id: mathPaper.id,
          created_by_id: teacherId, is_online: true, show_answer_after: true,
        })
        .select("id")
        .single();

      if (exam2 && !error) {
        await supabaseAdmin.from("questions").insert([
          { exam_id: exam2.id, type: "mcq", text: "What is 15% of 200?", options: JSON.stringify(["15", "30", "45", "20"]), correct_answer: "1", marks: 1, difficulty: "easy", order: 0 },
          { exam_id: exam2.id, type: "mcq", text: "Solve: 2x + 5 = 17. x = ?", options: JSON.stringify(["4", "6", "8", "11"]), correct_answer: "1", marks: 1, difficulty: "medium", order: 1 },
          { exam_id: exam2.id, type: "truefalse", text: "A square is a rectangle.", options: "[]", correct_answer: "true", marks: 1, difficulty: "easy", order: 2 },
        ]);
        results.exam2 = "created";
      } else {
        results.exam2 = `failed: ${error?.message}`;
      }
    } else {
      results.exam2 = existingMathExam ? "already exists" : "no paper";
    }
  }

  // 6. Create sample submission
  if (studentId && teacherId) {
    const { data: bioExam } = await supabaseAdmin.from("exams").select("id").eq("subject", "Biology").eq("status", "published").limit(1).maybeSingle();
    if (bioExam) {
      const { data: existingSub } = await supabaseAdmin.from("submissions").select("id").eq("student_id", studentId).eq("exam_id", bioExam.id).maybeSingle();
      if (!existingSub) {
        const { data: questions } = await supabaseAdmin.from("questions").select("*").eq("exam_id", bioExam.id).order("order");
        const qs = questions ?? [];
        const answersData: Record<number, string> = { 0: "1", 1: "false", 2: "photosynthesis", 3: "Broad and flat for maximum light absorption." };
        let score = 0, total = 0;
        const answerRows: { question_id: string; answer: string; is_correct: boolean | null; marks_awarded: number }[] = [];
        for (const q of qs) {
          total += q.marks;
          const a = answersData[q.order];
          if (!a) continue;
          let ic: boolean | null = null, aw = 0;
          if (q.type === "mcq") { ic = a === q.correct_answer; aw = ic ? q.marks : 0; }
          else if (q.type === "truefalse") { ic = a.toLowerCase() === q.correct_answer.toLowerCase(); aw = ic ? q.marks : 0; }
          else if (q.type === "short") { ic = a.trim().toLowerCase() === q.correct_answer.trim().toLowerCase(); aw = ic ? q.marks : 0; }
          score += aw;
          answerRows.push({ question_id: q.id, answer: a, is_correct: ic, marks_awarded: aw });
        }
        const pct = total > 0 ? (score / total) * 100 : 0;
        const { data: sub } = await supabaseAdmin.from("submissions").insert({
          exam_id: bioExam.id, student_id: studentId, score,
          percentage: Math.round(pct * 100) / 100, grade: gradeFor(pct), status: "auto_marked",
        }).select("id").single();
        if (sub) {
          await supabaseAdmin.from("answers").insert(answerRows.map((r) => ({ ...r, submission_id: sub.id })));
          results.submission = "created";
        }
      } else {
        results.submission = "already exists";
      }
    }
  }

  // 7. Schedule items
  const { data: bioExam } = await supabaseAdmin.from("exams").select("id").eq("subject", "Biology").eq("status", "published").limit(1).maybeSingle();
  const now = new Date();
  const at = (h: number, m: number, d = 0) => { const dt = new Date(now); dt.setDate(dt.getDate() + d); dt.setHours(h, m, 0, 0); return dt.toISOString(); };

  if (teacherId && bioExam) {
    const items = [
      { title: "Biology Quiz of the Day", type: "quiz_of_day", subject: "Biology", level: "form_4", scheduled_at: at(9, 0, 0), duration_mins: 15, status: "scheduled", exam_id: bioExam.id, created_by_id: teacherId },
      { title: "Chemistry Term Test", type: "test", subject: "Chemistry", level: "form_6", scheduled_at: at(11, 30, 0), duration_mins: 90, status: "scheduled", created_by_id: teacherId },
    ];
    let sc = 0;
    for (const item of items) {
      const { data: existing } = await supabaseAdmin.from("schedule_items").select("id").eq("title", item.title).maybeSingle();
      if (!existing) {
        const { error } = await supabaseAdmin.from("schedule_items").insert(item);
        if (!error) sc++;
      } else sc++;
    }
    results.scheduleItems = sc;
  }

  return results;
}
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

type GeneratedQuestionData = {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  marks: number;
  negativeMarks: number;
};

// Curated academic question synthesizer by subject and topic
function synthesizeCuratedQuestions(
  subject: string,
  topic: string,
  difficulty: string,
  examLevel: string,
  count: number
): GeneratedQuestionData[] {
  const normSub = subject.toLowerCase();
  const normTop = topic.toLowerCase();

  const questions: GeneratedQuestionData[] = [];

  for (let i = 1; i <= count; i++) {
    if (normSub.includes("phys")) {
      if (normTop.includes("motion") || normTop.includes("kinematics") || normTop.includes("force")) {
        questions.push({
          questionText: `A body of mass ${2 * i} kg is pushed along a horizontal frictionless surface by a constant force of ${10 * i} N. What is the acceleration produced in the body?`,
          options: [`${5} m/s²`, `${10} m/s²`, `${2.5} m/s²`, `${15} m/s²`],
          correctAnswer: "0",
          explanation: `According to Newton's Second Law of Motion: F = m × a. Therefore, a = F / m = (${10 * i} N) / (${2 * i} kg) = 5 m/s².`,
          marks: 4,
          negativeMarks: 1,
        });
      } else if (normTop.includes("electro") || normTop.includes("charge")) {
        questions.push({
          questionText: `Two point charges of magnitude +${i} µC and +${4 * i} µC are placed at a distance r apart in vacuum. The electrostatic force between them is F. If the distance between them is doubled, what will be the new electrostatic force?`,
          options: ["F / 4", "F / 2", "2F", "4F"],
          correctAnswer: "0",
          explanation: "According to Coulomb's Law, force is inversely proportional to the square of the distance between the charges: F ∝ 1 / r². When r becomes 2r, the new force F' = F / (2)² = F / 4.",
          marks: 4,
          negativeMarks: 1,
        });
      } else {
        questions.push({
          questionText: `In a ${examLevel} Physics experiment on ${topic}, what is the dimensional formula for work done and kinetic energy?`,
          options: ["[M L² T⁻²]", "[M L T⁻²]", "[M L² T⁻¹]", "[M L⁻¹ T⁻²]"],
          correctAnswer: "0",
          explanation: "Work done = Force × displacement = [M L T⁻²] × [L] = [M L² T⁻²]. Kinetic energy (½ m v²) also has the identical dimensions [M L² T⁻²].",
          marks: 4,
          negativeMarks: 1,
        });
      }
    } else if (normSub.includes("chem")) {
      if (normTop.includes("bond") || normTop.includes("hybrid")) {
        questions.push({
          questionText: `What is the hybridization and geometry of the central atom in methane (CH₄) and sulfur hexafluoride (SF₆) respectively?`,
          options: [
            "sp³ (Tetrahedral) and sp³d² (Octahedral)",
            "sp² (Trigonal planar) and sp³d (Trigonal bipyramidal)",
            "sp³ (Pyramidal) and d²sp³ (Octahedral)",
            "sp (Linear) and sp³d² (Square planar)",
          ],
          correctAnswer: "0",
          explanation: "In CH₄, carbon forms 4 sigma bonds with zero lone pairs, leading to sp³ hybridization and tetrahedral shape. In SF₆, sulfur forms 6 sigma bonds with 12 valence electrons, giving sp³d² hybridization with octahedral geometry.",
          marks: 4,
          negativeMarks: 1,
        });
      } else {
        questions.push({
          questionText: `For a chemical reaction under ${examLevel} syllabus on ${topic}, what is the relationship between equilibrium constant Kp and Kc?`,
          options: ["Kp = Kc (RT)^Δn", "Kc = Kp (RT)^Δn", "Kp = Kc / (RT)^Δn", "Kp = Kc + RTΔn"],
          correctAnswer: "0",
          explanation: "The relationship between Kp and Kc is given by Kp = Kc (RT)^Δn, where Δn is the difference between number of moles of gaseous products and gaseous reactants.",
          marks: 4,
          negativeMarks: 1,
        });
      }
    } else if (normSub.includes("math")) {
      questions.push({
        questionText: `Evaluate the derivative: If y = sin(${i}x) · cos(${i}x), what is dy/dx with respect to x?`,
        options: [
          `${i} cos(${2 * i}x)`,
          `${2 * i} sin(${i}x)`,
          `-${i} sin(${2 * i}x)`,
          `${i / 2} cos(${i}x)`,
        ],
        correctAnswer: "0",
        explanation: `Using the double-angle trigonometric identity: y = sin(${i}x) cos(${i}x) = ½ sin(${2 * i}x). Differentiating: dy/dx = ½ · (${2 * i}) cos(${2 * i}x) = ${i} cos(${2 * i}x).`,
        marks: 4,
        negativeMarks: 1,
      });
    } else if (normSub.includes("bio")) {
      questions.push({
        questionText: `Which cellular organelle is known as the powerhouse of eukaryotic cells and is the primary site of ATP synthesis through oxidative phosphorylation?`,
        options: ["Mitochondria", "Ribosome", "Endoplasmic Reticulum", "Golgi Apparatus"],
        correctAnswer: "0",
        explanation: "Mitochondria contain the electron transport chain and ATP synthase on their inner cristae membrane, generating the majority of ATP during cellular respiration.",
        marks: 4,
        negativeMarks: 1,
      });
    } else {
      questions.push({
        questionText: `Sample Assessment Question for ${subject} (${topic}): Which of the following statements correctly identifies the core principle of this topic in ${examLevel}?`,
        options: [
          "Primary fundamental principle with verified empirical evidence",
          "Secondary secondary hypothesis requiring further validation",
          "Obsolete formulation superseded by modern paradigms",
          "None of the provided choices",
        ],
        correctAnswer: "0",
        explanation: `In standard ${examLevel} curricula, the fundamental principle forms the baseline understanding for all analytical derivations.`,
        marks: 4,
        negativeMarks: 1,
      });
    }
  }

  return questions;
}

export async function POST(req: Request) {
  const ctx = await requirePermission("questions:write");
  if ("error" in ctx) return ctx.error;

  try {
    const body = await req.json();
    const {
      subject,
      topic,
      examLevel = "JEE Mains",
      difficulty = "MEDIUM",
      count = 3,
    } = body;

    if (!subject || !String(subject).trim()) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }

    if (!topic || !String(topic).trim()) {
      return NextResponse.json({ error: "Topic/Chapter is required" }, { status: 400 });
    }

    const numQuestions = Math.min(10, Math.max(1, Number(count) || 3));

    // Synthesize question drafts
    const generatedList = synthesizeCuratedQuestions(
      String(subject).trim(),
      String(topic).trim(),
      String(difficulty),
      String(examLevel),
      numQuestions
    );

    // Save questions into database
    const createdQuestions = await Promise.all(
      generatedList.map((q) =>
        prisma.question.create({
          data: {
            instituteId: ctx.instituteId,
            subject: String(subject).trim(),
            topic: String(topic).trim(),
            difficulty: String(difficulty),
            type: "MCQ_SINGLE",
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            marks: q.marks,
            negativeMarks: q.negativeMarks,
          },
        })
      )
    );

    await logAudit({
      instituteId: ctx.instituteId,
      actor: actorFromSession(ctx.session),
      action: "AI_QUESTIONS_GENERATED",
      entityType: "Question",
      metadata: {
        subject,
        topic,
        difficulty,
        count: createdQuestions.length,
      },
    });

    return NextResponse.json({
      success: true,
      count: createdQuestions.length,
      questions: createdQuestions,
    });
  } catch (error) {
    console.error("AI Question generation error:", error);
    return NextResponse.json({ error: "Failed to generate AI questions" }, { status: 500 });
  }
}

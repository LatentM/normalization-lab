// team.js — the "Developed By" details.
//
// ⚠ BEFORE SUBMISSION — two things must be done here:
//
//   1. THE THIRD MEMBER. The Digital Assignment guidelines state that a team
//      must have 1 or 3 members. Two is not a permitted size. Fill in the third
//      member below, or the team is non-compliant regardless of the code.
//
//   2. THE PHOTOGRAPHS. Student photographs are a stated requirement. Drop each
//      member's photo into  public/team/  as a square JPG or PNG (about 400×400
//      is plenty) and set `photo` to '/team/<filename>'. Until then the card
//      shows an initials placeholder, which will lose the mark.

export const TEAM = [
  {
    name: "Yusuf Khan",
    regNo: "25BCE5307",
    role: "Algorithm Engineer",
    contribution:
      "Implemented the entire computation layer in src/logic/ — the parser, attribute closure with step trace, candidate-key enumeration, minimal cover, normal-form diagnosis, 3NF synthesis, BCNF analysis, the chase for lossless join, dependency preservation, and the 4NF and 5NF checks.",
    photo: null, // e.g. '/team/yusuf.jpg'
  },
  {
    name: "Mohammed Mubashir Hasan",
    regNo: "25BCE5209",
    role: "Frontend Engineer",
    contribution:
      "Built the interface in src/components/ — the persistent relation rail, the step-trace and tableau renderers, the 3NF-versus-BCNF comparison, the higher-normal-form panel, the practice quiz, day/night mode, and the multi-format report download. Handled the Vite setup, the production build and deployment.",
    photo: null, // e.g. '/team/mubashir.jpg'
  },
  {
    name: "E T Suhas Aradhya",
    regNo: "25BCE5560",
    role: "Content & QA Lead",
    contribution:
      "Wrote the theory notes for all five normal forms and the anomaly example, authored the ten practice problems and hand-solved every answer independently of the code, then cross-checked the application output against those solutions. Produced the project report, the lab manual and the demo video.",
    photo: null,
    placeholder: true,
  },
];

export const GUIDE = {
  name: "Dr. Swaminathan A",
  title: "DBMS Faculty",
  label: "Guided By",
};

export const COURSE = {
  code: "BACSE202",
  name: "Database Systems",
  institution: "VIT Chennai",
  assignment: "Digital Assignment — Core Database Systems",
};

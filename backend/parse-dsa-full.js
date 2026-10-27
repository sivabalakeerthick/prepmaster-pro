const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'data-source', 'dsa-workbook.html');
const rawHtml = fs.readFileSync(htmlPath, 'utf8');

// Helper to strip HTML tags
function stripHtml(str) {
  if (!str) return '';
  return str.replace(/<[^>]+>/g, '').trim();
}

// 1. Parse Table of Contents
const tocList = [];
const tocRegex = /<div class="toc">[\s\S]*?<table>([\s\S]*?)<\/table>/i;
const tocMatch = rawHtml.match(tocRegex);
if (tocMatch) {
  const trMatches = [...tocMatch[1].matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
  // Skip header row
  for (let i = 1; i < trMatches.length; i++) {
    const tdMatches = [...trMatches[i][1].matchAll(/<td>([\s\S]*?)<\/td>/gi)].map(m => stripHtml(m[1]));
    if (tdMatches.length >= 4) {
      const num = tdMatches[0];
      const sectionName = tdMatches[1];
      const topicsCount = tdMatches[2];
      const estTime = tdMatches[3];
      
      // Extract emoji if present
      const emojiMatch = sectionName.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\S+)\s*/u);
      const emoji = emojiMatch ? emojiMatch[1] : '';
      const cleanTitle = sectionName.replace(emoji, '').trim();

      tocList.push({
        num,
        sectionName,
        title: cleanTitle,
        emoji,
        topicsCount,
        estTime,
        isLeetCode: num === '—'
      });
    }
  }
}

// 2. Parse Section 0 to 17
const sections = [];
// Split by <div class="section">
const sectionBlocks = rawHtml.split(/<div class="section">/i).slice(1);

for (const block of sectionBlocks) {
  // Check if it's a foundation section (Section 0 to 17)
  const h2Match = block.match(/<h2>([\s\S]*?)<\/h2>/i);
  if (!h2Match) continue;
  const rawH2 = h2Match[1].trim();

  // If this is LeetCode Roadmap or Study Plan, skip here
  if (rawH2.includes('LeetCode Interview Roadmap') || rawH2.includes('Study Plan')) {
    continue;
  }

  // Parse Section ID and Title
  // e.g. "☕ Section 0 — Java Coding Foundations" or "📊 Section 1 — Arrays"
  const secMatch = rawH2.match(/Section\s+(\d+)\s*—\s*([\s\S]*)/i);
  if (!secMatch) continue;

  const secId = parseInt(secMatch[1], 10);
  const cleanTitle = stripHtml(secMatch[2]);
  const emojiMatch = rawH2.match(/^([^\w\s<]+)/u);
  const emoji = emojiMatch ? emojiMatch[1].trim() : '📌';

  // Goal / Tip
  let goal = '';
  const tipMatch = block.match(/<div class="tip-box">([\s\S]*?)<\/div>/i);
  if (tipMatch) {
    goal = stripHtml(tipMatch[1]);
  }

  // Check if there are subsections like 9A, 9B, 9C
  // e.g. <h3>9A. Binary Trees</h3>
  const subHeadings = [...block.matchAll(/<h3>([\s\S]*?)<\/h3>/gi)];
  const tables = [...block.matchAll(/<table>([\s\S]*?)<\/table>/gi)];

  const exercises = [];

  if (subHeadings.length > 0 && tables.length === subHeadings.length) {
    // Subsection-based (Section 9)
    for (let sIdx = 0; sIdx < subHeadings.length; sIdx++) {
      const subTitle = stripHtml(subHeadings[sIdx][1]);
      const tableContent = tables[sIdx][1];
      const trs = [...tableContent.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];

      for (let rIdx = 1; rIdx < trs.length; rIdx++) {
        const tds = [...trs[rIdx][1].matchAll(/<td>([\s\S]*?)<\/td>/gi)];
        if (tds.length >= 4) {
          const num = stripHtml(tds[0][1]);
          const name = stripHtml(tds[1][1]);
          const description = stripHtml(tds[2][1]);
          
          let practice = null;
          const aMatch = tds[3][1].match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
          if (aMatch) {
            practice = {
              url: aMatch[1].trim(),
              text: stripHtml(aMatch[2])
            };
          }

          exercises.push({
            num,
            name,
            description,
            practice,
            subsection: subTitle
          });
        }
      }
    }
  } else {
    // Normal single-table section
    for (const tableMatch of tables) {
      const tableContent = tableMatch[1];
      const trs = [...tableContent.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];

      for (let rIdx = 1; rIdx < trs.length; rIdx++) {
        const tds = [...trs[rIdx][1].matchAll(/<td>([\s\S]*?)<\/td>/gi)];
        if (tds.length >= 4) {
          const num = stripHtml(tds[0][1]);
          const name = stripHtml(tds[1][1]);
          const description = stripHtml(tds[2][1]);
          
          let practice = null;
          const aMatch = tds[3][1].match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
          if (aMatch) {
            practice = {
              url: aMatch[1].trim(),
              text: stripHtml(aMatch[2])
            };
          }

          exercises.push({
            num,
            name,
            description,
            practice
          });
        }
      }
    }
  }

  // Header column labels
  const isDesignSec = secId === 17;
  const fieldLabels = isDesignSec 
    ? ['✅', 'Topic', 'What to Cover', 'Reference'] 
    : ['✅', '#', 'Exercise', 'Description', 'Code?', 'Practice Link'];

  sections.push({
    id: secId,
    rawTitle: rawH2,
    title: cleanTitle,
    emoji,
    goal,
    isDesignSec,
    fields: ['done', 'code'],
    fieldLabels,
    exercises
  });
}

// 3. Parse Part 2 — LeetCode Roadmap
const leetcodeCategories = [];
const leetcodeBlockMatch = rawHtml.match(/<!-- ================= LEETCODE ROADMAP ================= -->([\s\S]*?)(?:<!-- ================= STUDY PLAN ================= -->|$)/i);

if (leetcodeBlockMatch) {
  const lcHtml = leetcodeBlockMatch[1];
  const catSplits = lcHtml.split(/<h3>([\s\S]*?)<\/h3>/i);

  for (let i = 1; i < catSplits.length; i += 2) {
    const catTitle = stripHtml(catSplits[i]);
    const catBody = catSplits[i + 1] || '';

    const problems = [];
    const tableMatch = catBody.match(/<table>([\s\S]*?)<\/table>/i);
    if (tableMatch) {
      const trs = [...tableMatch[1].matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
      for (let rIdx = 1; rIdx < trs.length; rIdx++) {
        const tds = [...trs[rIdx][1].matchAll(/<td>([\s\S]*?)<\/td>/gi)];
        if (tds.length >= 4) {
          const id = stripHtml(tds[0][1]);
          const title = stripHtml(tds[1][1]);
          const diffHtml = tds[2][1];
          const diffText = stripHtml(diffHtml);
          
          let diffClass = 'med';
          if (diffHtml.includes('easy')) diffClass = 'easy';
          else if (diffHtml.includes('hard')) diffClass = 'hard';

          let link = '';
          const aMatch = tds[3][1].match(/href=["']([^"']+)["']/i);
          if (aMatch) link = aMatch[1].trim();

          problems.push({
            id,
            title,
            difficulty: diffText,
            diffClass,
            link
          });
        }
      }
    }

    leetcodeCategories.push({
      title: catTitle,
      problems
    });
  }
}

// 4. Parse 6-Stage Study Plan
const studyStages = [];
const stageTableMatch = rawHtml.match(/<table class="stage-table">([\s\S]*?)<\/table>/i);
if (stageTableMatch) {
  const trs = [...stageTableMatch[1].matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
  for (let i = 1; i < trs.length; i++) {
    const tds = [...trs[i][1].matchAll(/<td>([\s\S]*?)<\/td>/gi)];
    if (tds.length >= 4) {
      studyStages.push({
        stage: stripHtml(tds[0][1]),
        focus: stripHtml(tds[1][1]),
        duration: stripHtml(tds[2][1])
      });
    }
  }
}

// 5. Platforms table
const platforms = [
  { platform: '🟢 HackerRank Java', bestFor: 'Input/output, loops, arrays, strings, data structures', link: 'https://www.hackerrank.com/domains/java', label: 'hackerrank.com/domains/java' },
  { platform: '🔵 CodingBat Java', bestFor: 'Short exercises: String, Array, Logic, Recursion', link: 'https://codingbat.com/java', label: 'codingbat.com/java' },
  { platform: '🟡 LeetCode', bestFor: 'Interview-style problems (see Part 2)', link: 'https://leetcode.com/problemset/', label: 'leetcode.com/problemset' },
  { platform: '🟠 HackerRank Kit', bestFor: 'Guided: arrays, strings, hashmaps, graphs, DP', link: 'https://www.hackerrank.com/interview/interview-preparation-kit', label: 'Interview Prep Kit' }
];

// 6. Routine steps
const solvingRoutine = [
  '1. Define inputs/outputs',
  '2. Write examples',
  '3. Attempt brute force',
  '4. Code in Java',
  '5. Test edge cases',
  '6. Analyze time/space complexity',
  '7. Explain your solution aloud'
];

// Build comprehensive output object
const completeDsaData = {
  cover: {
    emoji: '🧠',
    title: 'Master DSA Practice Workbook',
    subtitle: 'Java Foundations · 180+ Beginner Exercises · LeetCode Roadmap',
    badges: [
      '✅ 180+ Practice Prompts',
      '🔗 130+ LeetCode Problems',
      '🎯 Interview-Ready Roadmap'
    ],
    note: 'For learners who know theory but feel weak at writing code.',
    step: 'Use in order: Java Basics → Beginner Practice → LeetCode'
  },
  howToUse: {
    intro: '🟢 Try every prompt yourself.\n✅ Tick it only when: your code runs · passes your own tests · you can explain the logic aloud.',
    ifStuck: [
      'Try for 20–30 minutes',
      'Use a hint (not the full solution)',
      'Close the solution and code again from scratch',
      'Explain the logic to an imaginary interviewer'
    ],
    importantTip: '📌 Important: Part 1 contains original beginner practice prompts with platform links. Part 2 links to the exact LeetCode problem. Where no exact online judge problem exists, the link opens the closest matching practice section.'
  },
  platforms,
  toc: tocList,
  sections,
  leetcodeCategories,
  studyStages,
  solvingRoutine
};

// Write out to dsaTopics.json
const outputPath = path.join(__dirname, 'src', 'data', 'dsaTopics.json');
fs.writeFileSync(outputPath, JSON.stringify(completeDsaData, null, 2), 'utf8');

console.log('Successfully generated complete dsaTopics.json:');
console.log('- TOC items:', tocList.length);
console.log('- Sections (0 to 17):', sections.length);
let totalExercises = 0;
sections.forEach(s => {
  totalExercises += s.exercises.length;
  console.log(`  Sec ${s.id}: ${s.title} -> ${s.exercises.length} exercises${s.exercises.some(e => e.subsection) ? ' (with subsections)' : ''}`);
});
console.log('- Total Beginner Exercises:', totalExercises);

let totalLc = 0;
console.log('- LeetCode Categories:', leetcodeCategories.length);
leetcodeCategories.forEach(c => {
  totalLc += c.problems.length;
  console.log(`  ${c.title} -> ${c.problems.length} problems`);
});
console.log('- Total LeetCode Problems:', totalLc);
console.log('- Study Stages:', studyStages.length);

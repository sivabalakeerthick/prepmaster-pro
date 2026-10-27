export interface TopicResource {
  url: string;
  text: string;
}

export interface Topic {
  name: string;
  isNew: boolean;
  resources?: TopicResource[];
}

export interface Section {
  id: number | string;
  title: string;
  rawTitle?: string;
  emoji: string;
  goal: string;
  fields: string[];
  fieldLabels: string[];
  topics: Topic[];
}

export interface ProgressSummary {
  sectionId: number | string;
  total: number;
  completed: number;
}

export interface DsaExercise {
  num: string;
  name: string;
  description: string;
  practice: { url: string; text: string } | null;
  subsection?: string;
}

export interface DsaSection {
  id: number;
  rawTitle: string;
  title: string;
  emoji: string;
  goal: string;
  isDesignSec?: boolean;
  fields: string[];
  fieldLabels: string[];
  exercises: DsaExercise[];
}

export interface LeetCodeProblem {
  id: string;
  title: string;
  difficulty: string;
  diffClass: string;
  link: string;
}

export interface LeetCodeCategory {
  title: string;
  problems: LeetCodeProblem[];
}

export interface StudyStage {
  stage: number | string;
  focus: string;
  duration: string;
}

export interface DsaTocItem {
  num: string;
  sectionName: string;
  title: string;
  emoji: string;
  topicsCount: string;
  estTime: string;
  isLeetCode?: boolean;
}

export interface DsaPlatform {
  platform: string;
  bestFor: string;
  link: string;
  label: string;
}

export interface DsaWorkbookData {
  toc?: DsaTocItem[];
  platforms?: DsaPlatform[];
  sections: DsaSection[];
  leetcodeCategories: LeetCodeCategory[];
  studyStages: StudyStage[];
  solvingRoutine?: string[];
}

export interface SectionsApiResponse {
  sections: Section[];
  interview: Section[];
  dsa: DsaWorkbookData;
}

export type ExtractedResumeExperience = {
  title?: string | null;
  projectTitle?: string | null;
  songTitle?: string | null;
  role?: string | null;
  credits?: string | null;
  studio?: string | null;
  company?: string | null;
  artist?: string | null;
  choreographer?: string | null;
  category?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
};

export type ExtractedResumeTraining = {
  name?: string | null;
  program?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

export type ExtractedResumeData = {
  name?: string | null;
  talentTypes?: string[] | null;
  experiences?: ExtractedResumeExperience[] | null;
  training?: ExtractedResumeTraining[] | null;
  skills?: string[] | null;
  height?: string | null;
  ethnicity?: string | null;
  hairColor?: string | null;
  eyeColor?: string | null;
  gender?: string | null;
  agent?: string | null;
  workLocations?: string[] | null;
  unionStatus?: string | null;
};

export type ProcessedResumeResult = {
  resumeUrl: string;
  extracted: ExtractedResumeData;
};

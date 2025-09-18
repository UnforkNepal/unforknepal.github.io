export type ConfidenceType = "high" | "low" | "medium";

export type DataSources = {
  organization: string;
  report: string;
  url: string;
  lastAccessed: string;
  verificationStatus: string;
};

export type MetricSources = { note: string; urls: string[] };

export type LivesLost = {
  estimate: number;
  units: string;
  description: string;
  confidence: ConfidenceType;
  metricSources: MetricSources[];
};

export type MetricSources1 = { note: string; urls: string[] };

export type MoneyWasted = {
  estimate: number;
  units: string;
  description: string;
  confidence: ConfidenceType;
  metricSources: MetricSources1[];
};

export type MetricSources2 = { note: string; urls: string[] };

export type ChildrenWithoutEducation = {
  estimate: number;
  units: string;
  description: string;
  confidence: ConfidenceType;
  metricSources: MetricSources2[];
};

export type MetricSources3 = { note: string; urls: string[] };

export type FamiliesInPoverty = {
  estimate: number;
  units: string;
  description: string;
  confidence: ConfidenceType;
  metricSources: MetricSources3[];
};

export type DailyToll = {
  methodologyNote: string;
  livesLost: LivesLost;
  moneyWasted: MoneyWasted;
  childrenWithoutEducation: ChildrenWithoutEducation;
  familiesInPoverty: FamiliesInPoverty;
};

export type CasesInvestigated = {
  value: number;
  units: string;
  description: string;
  confidence: ConfidenceType;
  sources: string[];
};

export type MoneyRecovered = {
  value: number;
  units: string;
  description: string;
  confidence: ConfidenceType;
  sources: string[];
};

export type CommunitiesHelped = {
  value: number;
  units: string;
  description: string;
  confidence: ConfidenceType;
  sources: string[];
};

export type VolunteersActive = {
  value: number;
  units: string;
  description: string;
  confidence: ConfidenceType;
  sources: string[];
};

export type MonthlyImpact = {
  casesInvestigated: CasesInvestigated;
  moneyRecovered: MoneyRecovered;
  communitiesHelped: CommunitiesHelped;
  volunteersActive: VolunteersActive;
};

export type Location = {
  province: string;
  district: string;
  coordinatesApprox: string;
};

export type Metrics = {
  estimatedMoneyWasted: number;
  moneyUnits: string;
  livesLostDirectly: number;
  familiesAffected: number;
  publicAssetsDiverted: string;
};

export type FeaturedCase = {
  title: string;
  summary: string;
  location: Location;
  metrics: Metrics;
  status: string;
  confidence: ConfidenceType;
  sources: string[];
};

export type ImpactMetrics = {
  dailyToll: DailyToll;
  monthlyImpact: MonthlyImpact;
  featuredCase: FeaturedCase;
};

export type CaseStudies = {
  caseId: string;
  title: string;
  summary: string;
  province: string;
  district: string;
  yearOpened: number;
  reportedMoneyWasted: number;
  moneyUnits: string;
  reportedLivesLost: number;
  familiesAffected: number;
  humanImpactNarrative: string;
  investigationStatus: string;
  sources: string[];
  confidence: ConfidenceType;
};

export type Testimonials = {
  id: string;
  anonymousName: string;
  age: number;
  province: string;
  relatedCaseId: string;
  text: string;
  collectorOrganization: string;
  verificationMethods: string;
  sources: string[];
  confidence: ConfidenceType;
  ageRange: string;
};

export type Methodology = {
  researchPhase: string;
  validationPhase: string;
  structuringPhase: string;
  reviewPhase: string;
  outputPhase: string;
};

export type NotesAndLimitations = {
  1: string;
  2: string;
  3: string;
  4: string;
};

export type UpdateGuidelines = {
  dailyToll: string;
  caseStudies: string;
  sources: string;
  impactMetrics: string;
};

export type UnforkNepalData = {
  version: string;
  lastUpdated: string;
  dataSources: DataSources[];
  impactMetrics: ImpactMetrics;
  caseStudies: CaseStudies[];
  testimonials: Testimonials[];
  methodology: Methodology;
  notesAndLimitations: NotesAndLimitations;
  updateGuidelines: UpdateGuidelines;
};

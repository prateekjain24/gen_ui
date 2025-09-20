export type PromptSignalSource = 'keyword' | 'llm' | 'merge';

export interface PromptSignalMetadata {
  source: PromptSignalSource;
  confidence: number;
  notes?: string;
}

export type TeamSizeBracket = 'solo' | '1-9' | '10-24' | '25+' | 'unknown';

export interface DecisionMakerSignal {
  role: string;
  seniority: 'ic' | 'manager' | 'director+';
  isPrimary: boolean;
}

export type ApprovalChainDepth = 'single' | 'dual' | 'multi' | 'unknown';

export type ToolIdentifier =
  | 'Slack'
  | 'Microsoft Teams'
  | 'Zoom'
  | 'Google Meet'
  | 'Notion'
  | 'Confluence'
  | 'Linear'
  | 'Jira'
  | 'Asana'
  | 'Trello'
  | 'ClickUp'
  | 'Monday.com'
  | 'Basecamp'
  | 'Airtable'
  | 'Figma'
  | 'Miro'
  | 'Lucidchart'
  | 'Dropbox'
  | 'Box'
  | 'Google Drive'
  | 'OneDrive'
  | 'GitHub'
  | 'GitLab'
  | 'Bitbucket'
  | 'CircleCI'
  | 'Jenkins'
  | 'PagerDuty'
  | 'Datadog'
  | 'New Relic'
  | 'Sentry'
  | 'ServiceNow'
  | 'Zendesk'
  | 'Freshdesk'
  | 'Intercom'
  | 'Salesforce'
  | 'HubSpot'
  | 'Marketo'
  | 'Mailchimp'
  | 'Amplitude'
  | 'Mixpanel'
  | 'Segment'
  | 'Snowflake'
  | 'Looker'
  | 'Tableau'
  | 'Power BI'
  | 'Workday'
  | 'BambooHR'
  | 'Okta'
  | 'Auth0'
  | '1Password'
  | 'Other';

export type IntegrationCriticality = 'must-have' | 'nice-to-have' | 'unspecified';

export type ComplianceTag =
  | 'SOC2'
  | 'HIPAA'
  | 'ISO27001'
  | 'GDPR'
  | 'SOX'
  | 'audit'
  | 'regulated-industry'
  | 'other';

export type CopyTone =
  | 'fast-paced'
  | 'meticulous'
  | 'trusted-advisor'
  | 'onboarding'
  | 'migration'
  | 'neutral';

export type IndustryTag =
  | 'saas'
  | 'fintech'
  | 'healthcare'
  | 'education'
  | 'manufacturing'
  | 'public-sector'
  | 'other';

export type PrimaryObjective =
  | 'launch'
  | 'scale'
  | 'migrate'
  | 'optimize'
  | 'compliance'
  | 'other';

export type TimelineConstraint = 'rush' | 'standard' | 'flexible';

export type BudgetConstraint = 'tight' | 'standard' | 'premium';

export interface ConstraintSignal {
  timeline?: TimelineConstraint;
  budget?: BudgetConstraint;
  notes?: string;
}

export type OperatingRegion = 'na' | 'emea' | 'latam' | 'apac' | 'global' | 'unspecified';

export interface PromptSignalValue<T> {
  value: T;
  metadata: PromptSignalMetadata;
}

export interface PromptSignals {
  teamSizeBracket: PromptSignalValue<TeamSizeBracket>;
  decisionMakers: PromptSignalValue<DecisionMakerSignal[]>;
  approvalChainDepth: PromptSignalValue<ApprovalChainDepth>;
  tools: PromptSignalValue<ToolIdentifier[]>;
  integrationCriticality: PromptSignalValue<IntegrationCriticality>;
  complianceTags: PromptSignalValue<ComplianceTag[]>;
  copyTone: PromptSignalValue<CopyTone>;
  industry: PromptSignalValue<IndustryTag>;
  primaryObjective: PromptSignalValue<PrimaryObjective>;
  constraints: PromptSignalValue<ConstraintSignal>;
  operatingRegion: PromptSignalValue<OperatingRegion>;
}

export type PromptSignalsPartial = Partial<PromptSignals>;

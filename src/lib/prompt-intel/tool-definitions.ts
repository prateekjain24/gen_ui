import type { ToolIdentifier } from "./types";

export interface ToolDefinition {
  id: ToolIdentifier;
  keywords: string[];
}

const sanitize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  { id: "Slack", keywords: ["slack"] },
  { id: "Microsoft Teams", keywords: ["microsoft teams", "ms teams", "teams"] },
  { id: "Zoom", keywords: ["zoom"] },
  { id: "Google Meet", keywords: ["google meet", "hangouts meet", "meet"] },
  { id: "Notion", keywords: ["notion"] },
  { id: "Confluence", keywords: ["confluence", "atlassian confluence"] },
  { id: "Linear", keywords: ["linear"] },
  { id: "Jira", keywords: ["jira"] },
  { id: "Asana", keywords: ["asana"] },
  { id: "Trello", keywords: ["trello"] },
  { id: "ClickUp", keywords: ["clickup", "click up"] },
  { id: "Monday.com", keywords: ["monday com", "monday.com", "monday"] },
  { id: "Basecamp", keywords: ["basecamp"] },
  { id: "Airtable", keywords: ["airtable"] },
  { id: "Figma", keywords: ["figma"] },
  { id: "Miro", keywords: ["miro", "realtimeboard", "real time board"] },
  { id: "Lucidchart", keywords: ["lucidchart", "lucid chart"] },
  { id: "Dropbox", keywords: ["dropbox"] },
  { id: "Box", keywords: ["box com", "box platform", "box cloud"] },
  { id: "Google Drive", keywords: ["google drive", "gdrive", "g drive"] },
  { id: "OneDrive", keywords: ["onedrive", "one drive"] },
  { id: "GitHub", keywords: ["github", "git hub"] },
  { id: "GitLab", keywords: ["gitlab", "git lab"] },
  { id: "Bitbucket", keywords: ["bitbucket", "bit bucket"] },
  { id: "CircleCI", keywords: ["circleci", "circle ci"] },
  { id: "Jenkins", keywords: ["jenkins"] },
  { id: "PagerDuty", keywords: ["pagerduty", "pager duty"] },
  { id: "Datadog", keywords: ["datadog", "data dog"] },
  { id: "New Relic", keywords: ["new relic"] },
  { id: "Sentry", keywords: ["sentry"] },
  { id: "ServiceNow", keywords: ["servicenow", "service now"] },
  { id: "Zendesk", keywords: ["zendesk"] },
  { id: "Freshdesk", keywords: ["freshdesk", "fresh desk"] },
  { id: "Intercom", keywords: ["intercom"] },
  { id: "Salesforce", keywords: ["salesforce", "sales force"] },
  { id: "HubSpot", keywords: ["hubspot", "hub spot"] },
  { id: "Marketo", keywords: ["marketo"] },
  { id: "Mailchimp", keywords: ["mailchimp", "mail chimp"] },
  { id: "Amplitude", keywords: ["amplitude"] },
  { id: "Mixpanel", keywords: ["mixpanel", "mix panel"] },
  { id: "Segment", keywords: ["segment", "twilio segment"] },
  { id: "Snowflake", keywords: ["snowflake"] },
  { id: "Looker", keywords: ["looker", "google looker"] },
  { id: "Tableau", keywords: ["tableau"] },
  { id: "Power BI", keywords: ["power bi", "powerbi"] },
  { id: "Workday", keywords: ["workday", "work day"] },
  { id: "BambooHR", keywords: ["bamboohr", "bamboo hr"] },
  { id: "Okta", keywords: ["okta"] },
  { id: "Auth0", keywords: ["auth0", "auth 0"] },
  { id: "1Password", keywords: ["1password", "onepassword", "1 password"] },
  { id: "Other", keywords: [] },
];

export const TOOL_LOOKUP: Record<string, ToolIdentifier> = TOOL_DEFINITIONS.reduce<Record<string, ToolIdentifier>>((acc, definition) => {
  const canonicalKey = sanitize(definition.id);
  if (canonicalKey) {
    acc[canonicalKey] = definition.id;
  }
  definition.keywords.forEach(keyword => {
    const normalized = sanitize(keyword);
    if (normalized) {
      acc[normalized] = definition.id;
    }
  });
  return acc;
}, {});

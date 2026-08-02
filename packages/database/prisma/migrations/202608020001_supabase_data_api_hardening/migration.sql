-- Harden Supabase Data API exposure for server-owned application tables.
-- AISwarmQA accesses these tables through server-side Prisma. Browser clients must not
-- query or mutate the raw application schema through Supabase REST/GraphQL.

revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;
revoke all privileges on all functions in schema public from anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

alter table if exists "User" enable row level security;
alter table if exists "Organization" enable row level security;
alter table if exists "OrganizationMember" enable row level security;
alter table if exists "Project" enable row level security;
alter table if exists "Audit" enable row level security;
alter table if exists "AuditPlan" enable row level security;
alter table if exists "Mission" enable row level security;
alter table if exists "BrowserAgentRun" enable row level security;
alter table if exists "BrowserAgentStep" enable row level security;
alter table if exists "BrowserSwarmRun" enable row level security;
alter table if exists "BrowserSwarmAgent" enable row level security;
alter table if exists "BrowserSession" enable row level security;
alter table if exists "Finding" enable row level security;
alter table if exists "FindingEvidence" enable row level security;
alter table if exists "BillingCustomer" enable row level security;
alter table if exists "WorkspaceSubscription" enable row level security;
alter table if exists "BillingWebhookEvent" enable row level security;
alter table if exists "WorkspaceUsageEvent" enable row level security;
alter table if exists "WorkspaceOnboarding" enable row level security;
alter table if exists "WorkspaceInvitation" enable row level security;
alter table if exists "EmailEvent" enable row level security;
alter table if exists "WorkspaceAuditLog" enable row level security;
alter table if exists "WorkspaceDeletionRequest" enable row level security;
alter table if exists "Report" enable row level security;
alter table if exists "GitHubConnection" enable row level security;
alter table if exists "GitHubAuthState" enable row level security;
alter table if exists "GitHubRepository" enable row level security;
alter table if exists "GitHubWebhookDelivery" enable row level security;
alter table if exists "GitHubExportBatch" enable row level security;
alter table if exists "FindingGitHubExport" enable row level security;

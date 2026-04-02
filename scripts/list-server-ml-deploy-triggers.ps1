<#
.SYNOPSIS
  Lists commits that touch server-ml/ (same path scope as .github/workflows/deploy-server-ml.yml).
  Use to correlate git activity with GCP Artifact Registry / Cloud Build usage.

.EXAMPLE
  .\scripts\list-server-ml-deploy-triggers.ps1 -Since "2026-01-01" -Until "2026-02-01" -Branch main
#>
param(
  [string] $Since = "2026-01-01",
  [string] $Until = "",
  [string] $Branch = "main"
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$range = "HEAD"
if ($Branch) { $range = $Branch }

$gitArgs = @("log", $range, "--format=%h %ci %s", "--since=$Since")
if ($Until) { $gitArgs += "--until=$Until" }
$gitArgs += @("--", "server-ml/")

$untilNote = if ($Until) { " until $Until" } else { "" }
Write-Host "Commits on ${range} touching server-ml/ (deploy-server-ml path filter) since ${Since}${untilNote}:" -ForegroundColor Cyan
& git @gitArgs

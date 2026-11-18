<#
One-command, safe local migration to a dedicated Ngọa Long repository with ONE main.
Requires Git, GitHub CLI (gh), and an authenticated GitHub owner session.
DOES NOT modify, rename, merge, or force-push any source branch in Heoofgaia.
DOES NOT copy Hero's active branch to the destination. Git ancestry is retained.
By default, new destination is private. A nonempty destination is never overwritten.
#>
[CmdletBinding()]
param(
  [string]$Owner = 'vuanhtuan161094-byte',
  [string]$DestinationName = 'MuuDinhTamQuoc',
  [string]$SourceBranch = 'codex/nl-wiki-01-r02-20261117',
  [string]$SourceRepository = 'vuanhtuan161094-byte/Heoofgaia'
)
$ErrorActionPreference = 'Stop'
$target = "$Owner/$DestinationName"
$sourceURL = "https://github.com/$SourceRepository.git"
$targetURL = "https://github.com/$target.git"
$work = Join-Path ([IO.Path]::GetTempPath()) ("ngoalong-main-" + [guid]::NewGuid().ToString('N'))

function Assert-Exit([string]$label) {
  if ($LASTEXITCODE -ne 0) { throw "$label failed (exit $LASTEXITCODE). No source ref was changed." }
}

foreach ($command in @('git', 'gh')) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    throw "Missing $command. Install Git + GitHub CLI first; nothing was changed."
  }
}
& gh auth status *> $null
Assert-Exit 'GitHub authentication'

try {
  # Clone only the current Ngọa Long task branch, retaining all ancestor commits.
  & git clone --single-branch --branch $SourceBranch --no-tags $sourceURL $work
  Assert-Exit 'Read-only source clone'
  $sourceSHA = (& git -C $work rev-parse HEAD).Trim()
  Assert-Exit 'Source SHA'
  if ($sourceSHA -notmatch '^[0-9a-f]{40}$') { throw 'Invalid source SHA' }

  # A separate main ref: never push historical Hero/CL task branches.
  & git -C $work switch -c main
  Assert-Exit 'Create local main'
  & git -C $work remote remove origin
  Assert-Exit 'Remove source remote from temporary clone'

  # Refuse to overwrite any nonempty destination.
  & gh repo view $target --json name --jq '.name' *> $null
  $exists = ($LASTEXITCODE -eq 0)
  if ($exists) {
    $remoteRefs = & git ls-remote --heads $targetURL
    Assert-Exit 'Check existing destination refs'
    if ($remoteRefs) {
      throw "Destination $target already has branches. Refusing to overwrite. Create/use an EMPTY repository."
    }
  } else {
    & gh repo create $target --private --description 'Muu Dinh Tam Quoc: standalone Ngoa Long-inspired strategy game'
    Assert-Exit 'Create private destination repository'
  }

  # Use the authenticated gh credential helper and push ONE branch.
  & gh auth setup-git
  Assert-Exit 'Set up GitHub CLI credential helper'
  & git -C $work remote add origin $targetURL
  Assert-Exit 'Add destination'
  & git -C $work push -u origin main
  Assert-Exit 'Push destination main'

  $destSHA = (& gh api "repos/$target/branches/main" --jq '.commit.sha').Trim()
  Assert-Exit 'Verify destination main SHA'
  if ($destSHA -ne $sourceSHA) { throw "SHA mismatch! Source=$sourceSHA destination=$destSHA" }
  $heads = @(& git ls-remote --heads $targetURL)
  Assert-Exit 'Verify exactly one destination branch'
  if ($heads.Count -ne 1 -or $heads[0] -notmatch 'refs/heads/main$') {
    throw 'Destination contains extra branches or has no main. Review on GitHub.'
  }
  $default = (& gh api "repos/$target" --jq '.default_branch').Trim()
  Assert-Exit 'Verify default branch'
  if ($default -ne 'main') { throw "Destination default branch is $default, not main; review repository settings." }

  Write-Host "SUCCESS: https://github.com/$target"
  Write-Host "ONE MAIN exact SHA: $destSHA"
  Write-Host 'Heoofgaia source, Hero branch, old PRs and Save history remain untouched.'
  Write-Host 'This is repository separation, NOT V1.0 gameplay acceptance or a clean deletion of legacy code.'
} finally {
  # Only remove this unique temporary clone; never remove the user's working tree.
  if (Test-Path -LiteralPath $work) {
    Remove-Item -LiteralPath $work -Recurse -Force
  }
}

param()
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies @([System.Drawing.Bitmap].Assembly.Location) -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class HogAlphaScan {
  public static object Scan(string path) {
    using (var image = new Bitmap(path)) {
      var rect = new Rectangle(0, 0, image.Width, image.Height);
      var data = image.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      try {
        long count = 0; int minA = 255, maxA = 0;
        int left = image.Width, top = image.Height, right = -1, bottom = -1;
        var row = new byte[Math.Abs(data.Stride)];
        for (int y = 0; y < image.Height; y++) {
          IntPtr rowPtr = IntPtr.Add(data.Scan0, y * data.Stride);
          Marshal.Copy(rowPtr, row, 0, row.Length);
          for (int x = 0; x < image.Width; x++) {
            int a = row[x * 4 + 3]; minA = Math.Min(minA, a); maxA = Math.Max(maxA, a);
            if (a >= 8) { count++; left = Math.Min(left, x); top = Math.Min(top, y); right = Math.Max(right, x); bottom = Math.Max(bottom, y); }
          }
        }
        return new object[] { minA, maxA, left, top, right, bottom, count };
      } finally { image.UnlockBits(data); }
    }
  }
}
'@

function Assert([bool]$condition, [string]$message) { if (-not $condition) { throw $message } }
function Get-Hash([string]$path) { (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }
function Get-PngRecord([string]$path, [string]$projectPath, [int[]]$pivot = @()) {
  $bytes = [IO.File]::ReadAllBytes($path)
  Assert ($bytes.Length -gt 32) "PNG too small: $projectPath"
  Assert ([BitConverter]::ToString($bytes[0..7]) -eq '89-50-4E-47-0D-0A-1A-0A') "Not a PNG: $projectPath"
  $width = [System.Net.IPAddress]::NetworkToHostOrder([BitConverter]::ToInt32($bytes, 16))
  $height = [System.Net.IPAddress]::NetworkToHostOrder([BitConverter]::ToInt32($bytes, 20))
  $bitDepth = [int]$bytes[24]; $colorType = [int]$bytes[25]
  $scan = [HogAlphaScan]::Scan((Resolve-Path -LiteralPath $path).Path)
  $record = [ordered]@{
    projectPath = $projectPath; bytes = $bytes.Length; resolution = "${width}x${height}"
    bitDepth = $bitDepth; colorType = $colorType; sha256 = Get-Hash $path; format = 'RGBA PNG'
    alphaRange = @([int]$scan[0], [int]$scan[1]); alphaGte8Bounds = @([int]$scan[2], [int]$scan[3], [int]$scan[4], [int]$scan[5]); alphaGte8Pixels = [long]$scan[6]
  }
  if ($pivot.Count -gt 0) { $record.pivotPixels = $pivot; $record.pivotNormalized = @([math]::Round($pivot[0] / $width, 6), [math]::Round($pivot[1] / $height, 6)) }
  return $record
}
function Get-ScreenshotRecord([string]$projectPath) {
  $path = Join-Path $root $projectPath; $bytes = [IO.File]::ReadAllBytes($path)
  Assert ($bytes.Length -gt 32) "Screenshot missing/empty: $projectPath"
  Assert ([BitConverter]::ToString($bytes[0..7]) -eq '89-50-4E-47-0D-0A-1A-0A') "Screenshot not PNG: $projectPath"
  $w = [System.Net.IPAddress]::NetworkToHostOrder([BitConverter]::ToInt32($bytes, 16)); $h = [System.Net.IPAddress]::NetworkToHostOrder([BitConverter]::ToInt32($bytes, 20))
  return [ordered]@{ projectPath = $projectPath; bytes = $bytes.Length; resolution = "${w}x${h}"; sha256 = Get-Hash $path }
}

$masterPath = 'assets/generated/hg11/source/human-town-hall-master.png'
$cleanPath = 'assets/generated/hg11/source/human-town-hall-master-clean.png'
$runtimePath = 'assets/generated/hg11/buildings/human-town-hall.png'
$bundlePath = 'Play-Heoofgaia-HG11.html'
$receiptPath = 'docs/qa/hg11/human-barracks-building-chrome.json'
$master = Get-PngRecord $masterPath $masterPath
$cleaned = Get-PngRecord $cleanPath $cleanPath
$runtime = Get-PngRecord $runtimePath $runtimePath @(256, 488)
Assert ($master.resolution -eq '1254x1254' -and $cleaned.resolution -eq '1254x1254') 'Master size mismatch'
Assert ($runtime.resolution -eq '512x512' -and $runtime.bitDepth -eq 8 -and $runtime.colorType -eq 6) 'Runtime must be 512x512 8-bit RGBA'
foreach ($record in @($master, $cleaned, $runtime)) { Assert ($record.alphaRange[0] -eq 0 -and $record.alphaRange[1] -eq 255) "Expected transparency and opaque pixels: $($record.projectPath)" }

$bundleSha = Get-Hash $bundlePath; $bundleBytes = [IO.File]::ReadAllBytes((Resolve-Path $bundlePath).Path)
$html = [Text.Encoding]::UTF8.GetString($bundleBytes); $runtimeB64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($runtimePath))
Assert ($html.Contains('id="asset-human-town-hall"') -and $html.Contains("src=`"data:image/png;base64,$runtimeB64`"")) 'Town Hall image is missing from the bundled standalone HTML'
Assert (-not $html.Contains('assets/generated/hg11/buildings/')) 'Offline bundle retains a project-relative building asset URL'
$receipt = Get-Content -LiteralPath $receiptPath -Encoding UTF8 -Raw | ConvertFrom-Json
Assert ($receipt.total -eq 16 -and $receipt.passed -eq 16 -and $receipt.failed -eq 0 -and @($receipt.errors).Count -eq 0) 'Focused Chrome receipt is not 16/16 clean'
Assert ($receipt.offlineBundleSha256 -eq $bundleSha) 'Focused Chrome receipt does not match current offline bundle SHA-256'
$shotRecords = @($receipt.screenshots | ForEach-Object { Get-ScreenshotRecord $_.path })
foreach ($i in 0..($shotRecords.Count - 1)) { Assert ($shotRecords[$i].sha256 -eq $receipt.screenshots[$i].sha256 -and $shotRecords[$i].bytes -eq $receipt.screenshots[$i].bytes) "Screenshot receipt mismatch: $($shotRecords[$i].projectPath)" }

$manifest = [ordered]@{
  schema = 'hog1-building-art-v1'; project = 'Anh Hùng Thời Loạn / Heroes of Gaia 1 reconstruction'
  assetId = 'HOG1-HG11-HUMAN-TOWN-HALL-v1'; buildingKey = 'hall'; faction = 'human'; status = 'RECREATED'
  historicalIdentity = 'Human Town Hall identity in the independent game catalog. The architecture is newly authored and is not asserted to match original HOG1 art.'
  provider = 'ChatGPT image_gen.imagegen'; generationPrompt = 'assets/generated/hg11/buildings/human-town-hall-prompt.md#prompt'
  sourceImageId = 'exec-3d619fff-5dff-45ab-8581-05cfba019565.png'; sourceFile = 'assets/generated/hg11/source/human-town-hall-master.png'
  sourceRoute = 'Generated independently from text with transparent background; no historical screenshot, original client art or third-party game image was supplied as image input.'
  generationTimestamp = 'NOT_REPORTED_BY_IMAGE_TOOL'; generationCost = 'NOT_REPORTED_BY_IMAGE_TOOL'
  licenseAssessment = 'New project recreation; no extracted HOG1 commercial asset is included. Original commercial artwork is not bundled. This manifest does not grant third-party rights or claim legal exclusivity.'
  master = $master; cleanedMaster = $cleaned; runtime = $runtime
  visualDesign = [ordered]@{ identity = 'Taller ceremonial Human civic hall with ivory limestone, terracotta-red roof, dark timber, restrained blue-and-gold trim and a formal arched entrance.'; originalVisualParityClaimed = $false; sourceImageHadOriginalGameArt = $false }
  states = [ordered]@{ masterCreated = $true; transparentAlphaVerified = $true; singleBuildingReviewed = $true; runtimeExported = $true; embeddedInOfflineGame = $true; integratedInBuildingDetail = $true; realConstructionActionStillEnabled = $true; v07SaveLoadQueueVerified = $true; animationFrames = 0 }
  qualityGate = [ordered]@{
    alphaScan = 'PASS: raw, cleaned and runtime PNGs scanned with Windows System.Drawing; RGBA alpha range 0-255 and alpha>=8 bounds/pixel counts recorded.'
    agentSpriteForgeAdapter = 'BLOCKED: its inspect helper requires Pillow, which is not installed; no upstream Sprite Forge CLI was present. The independent System.Drawing PNG scan and actual Chrome review were used.'
    browserIntegration = 'PASS: actual installed Chrome file:// game loaded embedded 512px Town Hall art from the Human city canvas hotspot.'
    gameplay = 'PASS: real UI paid for Town Hall 2, v07 Save/Reload preserved the construction queue and a real engine tick completed it; Barracks 2 was also paid, saved, reloaded and completed.'
    responsiveLayout = 'PASS: actual Chrome at 390px displayed Town Hall and Barracks details without horizontal overflow.'
    javascriptErrors = 'PASS: focused 16-check session recorded zero page errors.'
  }
  integration = [ordered]@{
    offlineBundle = [ordered]@{ projectPath = $bundlePath; sha256 = $bundleSha; bytes = $bundleBytes.Length }
    receipt = $receiptPath; screenshotCount = $shotRecords.Count; screenshots = $shotRecords
    browser = 'Installed Google Chrome; actual standalone local file:// HTML'
    saveSchema = 'v07 unchanged; existing construction queue data was round-tripped through the real UI save/reload flow.'
  }
  qualityTooling = [ordered]@{ agentSpriteForgeInspect = 'BLOCKED'; reason = 'Python Pillow is absent; used independent Windows System.Drawing scan and Chrome screenshots.' }
  scopeLimitations = @('One independent static Town Hall detail asset; no Town Hall animation.', 'City background remains flattened; other Human buildings and the other factions remain separate work.', 'Historical art parity has not been established; generated art is not original HOG1 art.')
}
$manifestPath = 'assets/generated/hg11/buildings/human-town-hall-manifest.json'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText((Join-Path $root $manifestPath), ($manifest | ConvertTo-Json -Depth 50), $utf8NoBom)

& node 'tools/sync-hg11-human-town-hall-manifests.cjs'
if ($LASTEXITCODE -ne 0) { throw 'Node manifest synchronizer failed.' }
Write-Output "Town Hall manifest verified; bundle=$bundleSha; focused Chrome=$($receipt.passed)/$($receipt.total); runtime=$($runtime.sha256)"

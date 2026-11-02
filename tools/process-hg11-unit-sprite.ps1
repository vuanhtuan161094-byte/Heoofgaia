param(
    [Parameter(Mandatory = $true)][string]$InputPng,
    [Parameter(Mandatory = $true)][string]$CleanMasterPng,
    [Parameter(Mandatory = $true)][string]$RuntimePng,
    [int]$RuntimeSize = 512,
    [int]$FigureHeight = 380,
    [int]$PivotY = 446
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$repoRoot = Split-Path -Parent $PSScriptRoot
$InputPng = (Resolve-Path -LiteralPath $InputPng).Path
if (-not [System.IO.Path]::IsPathRooted($CleanMasterPng)) { $CleanMasterPng = Join-Path $repoRoot $CleanMasterPng }
if (-not [System.IO.Path]::IsPathRooted($RuntimePng)) { $RuntimePng = Join-Path $repoRoot $RuntimePng }
$CleanMasterPng = [System.IO.Path]::GetFullPath($CleanMasterPng)
$RuntimePng = [System.IO.Path]::GetFullPath($RuntimePng)
[System.IO.Directory]::CreateDirectory((Split-Path -Parent $CleanMasterPng)) | Out-Null
[System.IO.Directory]::CreateDirectory((Split-Path -Parent $RuntimePng)) | Out-Null

# Build against the same System.Drawing implementation used by this PowerShell
# host, including its forwarded Windows drawing types.
$refs = @([System.Drawing.Bitmap].Assembly.Location, [System.Object].Assembly.Location,
          [System.Runtime.InteropServices.Marshal].Assembly.Location)
foreach ($name in [System.Drawing.Bitmap].Assembly.GetReferencedAssemblies()) {
    try {
        $location = [System.Reflection.Assembly]::Load($name).Location
        if ($location) { $refs += $location }
    } catch {}
}

$source = @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class HogSpriteProcessor {
    private static byte[] ReadPixels(string path, out int width, out int height) {
        using (var original = new Bitmap(path)) {
            width = original.Width; height = original.Height;
            using (var bitmap = new Bitmap(width, height, PixelFormat.Format32bppArgb)) {
                using (var graphics = Graphics.FromImage(bitmap)) {
                    graphics.CompositingMode = CompositingMode.SourceCopy;
                    graphics.DrawImage(original, 0, 0, width, height);
                }
                var rect = new Rectangle(0, 0, width, height);
                var data = bitmap.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                var pixels = new byte[width * height * 4];
                for (int y = 0; y < height; y++)
                    Marshal.Copy(IntPtr.Add(data.Scan0, y * data.Stride), pixels, y * width * 4, width * 4);
                bitmap.UnlockBits(data);
                return pixels;
            }
        }
    }

    private static void WritePixels(string path, byte[] pixels, int width, int height) {
        using (var bitmap = new Bitmap(width, height, PixelFormat.Format32bppArgb)) {
            var rect = new Rectangle(0, 0, width, height);
            var data = bitmap.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
            for (int y = 0; y < height; y++)
                Marshal.Copy(pixels, y * width * 4, IntPtr.Add(data.Scan0, y * data.Stride), width * 4);
            bitmap.UnlockBits(data);
            bitmap.Save(path, ImageFormat.Png);
        }
    }

    public static string Process(string input, string cleanMaster, string runtime,
                                 int runtimeSize, int figureHeight, int pivotY) {
        int width, height;
        var pixels = ReadPixels(input, out width, out height);
        int length = width * height;
        var visited = new bool[length];
        var queue = new int[length];
        int[] corePixels = new int[0];
        int largest = 0;

        // Keep the largest opaque 8-connected silhouette. The generated master
        // was visually inspected first; this removes detached color specks from
        // the transparent-edge mask without painting over the subject.
        for (int start = 0; start < length; start++) {
            if (visited[start] || pixels[start * 4 + 3] < 128) continue;
            int head = 0, tail = 0;
            visited[start] = true; queue[tail++] = start;
            while (head < tail) {
                int index = queue[head++], x = index % width, y = index / width;
                for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
                    if (dx == 0 && dy == 0) continue;
                    int nx = x + dx, ny = y + dy;
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    int next = ny * width + nx;
                    if (!visited[next] && pixels[next * 4 + 3] >= 128) {
                        visited[next] = true; queue[tail++] = next;
                    }
                }
            }
            if (tail > largest) {
                largest = tail;
                corePixels = new int[tail];
                Array.Copy(queue, corePixels, tail);
            }
        }
        if (largest < 10000) throw new InvalidOperationException("No dominant full-character alpha component found.");

        var core = new bool[length];
        for (int i = 0; i < corePixels.Length; i++) core[corePixels[i]] = true;
        var cleaned = new byte[pixels.Length];
        int minX = width, minY = height, maxX = -1, maxY = -1;

        for (int index = 0; index < length; index++) {
            int offset = index * 4;
            if (core[index]) {
                cleaned[offset] = pixels[offset];
                cleaned[offset + 1] = pixels[offset + 1];
                cleaned[offset + 2] = pixels[offset + 2];
                cleaned[offset + 3] = pixels[offset + 3];
            } else {
                int x = index % width, y = index / width, bestDistance = 99, nearest = -1;
                for (int dy = -2; dy <= 2; dy++) for (int dx = -2; dx <= 2; dx++) {
                    int distance = dx * dx + dy * dy;
                    if (distance == 0 || distance > 4 || distance >= bestDistance) continue;
                    int nx = x + dx, ny = y + dy;
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    int candidate = ny * width + nx;
                    if (core[candidate]) { bestDistance = distance; nearest = candidate; }
                }
                if (nearest >= 0) {
                    // Rebuild a 1–2 pixel antialiased edge from the nearest
                    // opaque subject color, avoiding the generated RGB fringe.
                    int source = nearest * 4;
                    cleaned[offset] = pixels[source];
                    cleaned[offset + 1] = pixels[source + 1];
                    cleaned[offset + 2] = pixels[source + 2];
                    cleaned[offset + 3] = bestDistance == 1 ? (byte)96 : bestDistance == 2 ? (byte)64 : (byte)32;
                }
            }
            if (cleaned[offset + 3] >= 8) {
                int x = index % width, y = index / width;
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
        }
        if (maxX < minX || maxY < minY) throw new InvalidOperationException("Clean alpha bounds are empty.");
        WritePixels(cleanMaster, cleaned, width, height);

        int cropWidth = maxX - minX + 1, cropHeight = maxY - minY + 1;
        int targetHeight = Math.Min(figureHeight, runtimeSize - 16);
        int targetWidth = (int)Math.Round(cropWidth * (double)targetHeight / cropHeight);
        if (targetWidth > runtimeSize - 16) {
            targetWidth = runtimeSize - 16;
            targetHeight = (int)Math.Round(cropHeight * (double)targetWidth / cropWidth);
        }
        int destX = (runtimeSize - targetWidth) / 2;
        int destY = pivotY - targetHeight;
        if (destY < 0 || destY + targetHeight > runtimeSize || destX < 0 || destX + targetWidth > runtimeSize)
            throw new InvalidOperationException("Sprite registration exceeds runtime canvas.");

        using (var master = new Bitmap(cleanMaster))
        using (var output = new Bitmap(runtimeSize, runtimeSize, PixelFormat.Format32bppArgb))
        using (var graphics = Graphics.FromImage(output)) {
            graphics.Clear(Color.Transparent);
            graphics.CompositingMode = CompositingMode.SourceCopy;
            graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
            graphics.SmoothingMode = SmoothingMode.HighQuality;
            graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
            var sourceRect = new Rectangle(minX, minY, cropWidth, cropHeight);
            var destinationRect = new Rectangle(destX, destY, targetWidth, targetHeight);
            graphics.DrawImage(master, destinationRect, sourceRect, GraphicsUnit.Pixel);
            output.Save(runtime, ImageFormat.Png);
        }
        return width + "x" + height + "; core=" + largest + "; cleanBounds=[" + minX + "," + minY + "," + maxX + "," + maxY + "]" +
               "; runtime=" + runtimeSize + "x" + runtimeSize + "; figure=" + targetWidth + "x" + targetHeight + "; pivot=[" + (runtimeSize / 2) + "," + (destY + targetHeight) + "]";
    }
}
'@

Add-Type -TypeDefinition $source -ReferencedAssemblies ($refs | Select-Object -Unique)
$result = [HogSpriteProcessor]::Process($InputPng, $CleanMasterPng, $RuntimePng, $RuntimeSize, $FigureHeight, $PivotY)
Write-Output $result
Get-FileHash -LiteralPath $CleanMasterPng -Algorithm SHA256
Get-FileHash -LiteralPath $RuntimePng -Algorithm SHA256

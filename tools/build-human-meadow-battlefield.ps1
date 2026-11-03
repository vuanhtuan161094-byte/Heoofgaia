param([switch]$Force)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$source=Join-Path $root 'assets/generated/hg11/battlefield/source/human-meadow-master.png'
$output=Join-Path $root 'assets/generated/hg11/battlefield/human-meadow-1176x550.png'
if(!(Test-Path -LiteralPath $source)){throw "Missing source master: $source"}
if((Test-Path -LiteralPath $output)-and !$Force){throw "Refusing to overwrite existing runtime output: $output (pass -Force after review)"}
$inputImage=[Drawing.Bitmap]::new($source)
$bitmap=$null;$graphics=$null
try {
 if($inputImage.Width -ne 1817 -or $inputImage.Height -ne 866){throw "Expected pinned 1817x866 source master, got $($inputImage.Width)x$($inputImage.Height)"}
 $cropHeight=850;$cropY=[int][Math]::Floor(($inputImage.Height-$cropHeight)/2)
 $bitmap=[Drawing.Bitmap]::new(1176,550,[Drawing.Imaging.PixelFormat]::Format24bppRgb)
 $graphics=[Drawing.Graphics]::FromImage($bitmap)
 $graphics.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 $graphics.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::HighQuality
 $graphics.CompositingQuality=[Drawing.Drawing2D.CompositingQuality]::HighQuality
 $graphics.DrawImage($inputImage,[Drawing.Rectangle]::new(0,0,1176,550),[Drawing.Rectangle]::new(0,$cropY,1817,$cropHeight),[Drawing.GraphicsUnit]::Pixel)
 $bitmap.Save($output,[Drawing.Imaging.ImageFormat]::Png)
 $samples=[Collections.Generic.HashSet[string]]::new()
 for($y=0;$y -lt 550;$y+=11){for($x=0;$x -lt 1176;$x+=11){$c=$bitmap.GetPixel($x,$y);$samples.Add("$($c.R),$($c.G),$($c.B)")|Out-Null}}
 if($samples.Count -lt 500){throw "Unexpectedly low image variation: $($samples.Count) colors"}
 $hash=(Get-FileHash $output -Algorithm SHA256).Hash
 [pscustomobject]@{source=$source;sourceSize="$($inputImage.Width)x$($inputImage.Height)";sourceSha256=(Get-FileHash $source -Algorithm SHA256).Hash;crop="x=0 y=$cropY width=1817 height=850";output=$output;resolution='1176x550';sampledUniqueRgb=$samples.Count;runtimeBytes=(Get-Item $output).Length;runtimeSha256=$hash;alpha='opaque RGB24'}|ConvertTo-Json -Compress
} finally {if($graphics){$graphics.Dispose()};if($bitmap){$bitmap.Dispose()};$inputImage.Dispose()}


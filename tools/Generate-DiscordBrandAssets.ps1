Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"

$assetDir = Join-Path (Resolve-Path "$PSScriptRoot\..") "assets\discord"
New-Item -ItemType Directory -Force -Path $assetDir | Out-Null

function ColorFromHex([string]$hex) {
  $clean = $hex.TrimStart("#")
  return [System.Drawing.Color]::FromArgb(
    [Convert]::ToInt32($clean.Substring(0, 2), 16),
    [Convert]::ToInt32($clean.Substring(2, 2), 16),
    [Convert]::ToInt32($clean.Substring(4, 2), 16)
  )
}

function New-Brush([string]$hex) {
  return New-Object System.Drawing.SolidBrush (ColorFromHex $hex)
}

function New-Pen([string]$hex, [float]$width = 1) {
  return New-Object System.Drawing.Pen (ColorFromHex $hex), $width
}

function New-Font([float]$size, $style = [System.Drawing.FontStyle]::Regular) {
  return [System.Drawing.Font]::new("Segoe UI", $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
}

function Fill-RoundRect($g, $brush, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  $g.FillPath($brush, $path)
  $path.Dispose()
}

function Draw-Background($g, [int]$w, [int]$h) {
  $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, (ColorFromHex "#071014"), (ColorFromHex "#132126"), 35
  $g.FillRectangle($bg, $rect)
  $bg.Dispose()

  $gridPen = New-Pen "#20343a" 1
  for ($x = 0; $x -lt $w; $x += 48) { $g.DrawLine($gridPen, $x, 0, $x, $h) }
  for ($y = 0; $y -lt $h; $y += 48) { $g.DrawLine($gridPen, 0, $y, $w, $y) }
  $gridPen.Dispose()

  $glow1 = New-Object System.Drawing.Drawing2D.GraphicsPath
  $glow1.AddEllipse([int](-$w * 0.12), [int](-$h * 0.25), [int]($w * 0.6), [int]($h * 0.9))
  $brush1 = New-Object System.Drawing.Drawing2D.PathGradientBrush $glow1
  $brush1.CenterColor = [System.Drawing.Color]::FromArgb(90, 18, 201, 154)
  $brush1.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 18, 201, 154))
  $g.FillPath($brush1, $glow1)
  $brush1.Dispose()
  $glow1.Dispose()

  $glow2 = New-Object System.Drawing.Drawing2D.GraphicsPath
  $glow2.AddEllipse([int]($w * 0.58), [int](-$h * 0.2), [int]($w * 0.58), [int]($h * 0.9))
  $brush2 = New-Object System.Drawing.Drawing2D.PathGradientBrush $glow2
  $brush2.CenterColor = [System.Drawing.Color]::FromArgb(72, 246, 177, 61)
  $brush2.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 246, 177, 61))
  $g.FillPath($brush2, $glow2)
  $brush2.Dispose()
  $glow2.Dispose()
}

function Draw-PandaMark($g, [float]$cx, [float]$cy, [float]$scale) {
  $dark = New-Brush "#071014"
  $ink = New-Brush "#10181c"
  $white = New-Brush "#f4fbf8"
  $teal = New-Brush "#12c99a"
  $gold = New-Brush "#f6b13d"
  $lineTeal = New-Pen "#12c99a" ([Math]::Max(3, 5 * $scale))
  $lineGold = New-Pen "#f6b13d" ([Math]::Max(2, 3 * $scale))
  $lineDark = New-Pen "#071014" ([Math]::Max(2, 3 * $scale))

  $g.FillEllipse($ink, [single]($cx - 115 * $scale), [single]($cy - 98 * $scale), [single](76 * $scale), [single](76 * $scale))
  $g.FillEllipse($ink, [single]($cx + 39 * $scale), [single]($cy - 98 * $scale), [single](76 * $scale), [single](76 * $scale))
  $g.FillEllipse($white, [single]($cx - 92 * $scale), [single]($cy - 78 * $scale), [single](184 * $scale), [single](170 * $scale))
  $g.FillEllipse($ink, [single]($cx - 62 * $scale), [single]($cy - 28 * $scale), [single](48 * $scale), [single](40 * $scale))
  $g.FillEllipse($ink, [single]($cx + 14 * $scale), [single]($cy - 28 * $scale), [single](48 * $scale), [single](40 * $scale))
  $g.FillEllipse($teal, [single]($cx - 43 * $scale), [single]($cy - 16 * $scale), [single](15 * $scale), [single](15 * $scale))
  $g.FillEllipse($teal, [single]($cx + 28 * $scale), [single]($cy - 16 * $scale), [single](15 * $scale), [single](15 * $scale))
  $g.FillEllipse($dark, [single]($cx - 9 * $scale), [single]($cy + 13 * $scale), [single](18 * $scale), [single](12 * $scale))
  $g.DrawArc($lineDark, [single]($cx - 25 * $scale), [single]($cy + 12 * $scale), [single](50 * $scale), [single](45 * $scale), 25, 130)

  $g.DrawArc($lineTeal, [single]($cx - 122 * $scale), [single]($cy - 52 * $scale), [single](244 * $scale), [single](160 * $scale), 195, 150)
  Fill-RoundRect $g $teal ([single]($cx - 126 * $scale)) ([single]($cy - 12 * $scale)) ([single](28 * $scale)) ([single](76 * $scale)) ([single](11 * $scale))
  Fill-RoundRect $g $teal ([single]($cx + 98 * $scale)) ([single]($cy - 12 * $scale)) ([single](28 * $scale)) ([single](76 * $scale)) ([single](11 * $scale))

  $g.DrawLine($lineGold, [single]($cx - 48 * $scale), [single]($cy - 112 * $scale), [single]($cx - 26 * $scale), [single]($cy - 112 * $scale))
  $g.DrawLine($lineGold, [single]($cx - 14 * $scale), [single]($cy - 112 * $scale), [single]($cx + 8 * $scale), [single]($cy - 112 * $scale))
  $g.DrawLine($lineGold, [single]($cx + 20 * $scale), [single]($cy - 112 * $scale), [single]($cx + 42 * $scale), [single]($cy - 112 * $scale))

  $dark.Dispose()
  $ink.Dispose()
  $white.Dispose()
  $teal.Dispose()
  $gold.Dispose()
  $lineTeal.Dispose()
  $lineGold.Dispose()
  $lineDark.Dispose()
}

function New-Canvas([int]$w, [int]$h) {
  $bitmap = New-Object System.Drawing.Bitmap $w, $h
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  Draw-Background $graphics $w $h
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Save-Png($bitmap, [string]$path) {
  if (Test-Path $path) { Remove-Item -LiteralPath $path -Force }
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

function Draw-Text($g, [string]$text, $font, $brush, [float]$x, [float]$y) {
  $g.DrawString($text, $font, $brush, [single]$x, [single]$y)
}

$white = New-Brush "#edf8f7"
$teal = New-Brush "#12c99a"
$gold = New-Brush "#f6b13d"
$muted = New-Brush "#a7b8bc"

$icon = New-Canvas 512 512
$g = $icon.Graphics
$ring = New-Pen "#12c99a" 10
$ring2 = New-Pen "#f6b13d" 4
$g.DrawEllipse($ring, 26, 26, 460, 460)
$g.DrawEllipse($ring2, 47, 47, 418, 418)
Draw-PandaMark $g 256 252 1.28
$g.Dispose()
Save-Png $icon.Bitmap (Join-Path $assetDir "cueforge-discord-icon.png")
Copy-Item -LiteralPath (Join-Path $assetDir "cueforge-discord-icon.png") -Destination (Join-Path $assetDir "cueforge-server-pfp.png") -Force
$ring.Dispose()
$ring2.Dispose()

$banner = New-Canvas 960 540
$g = $banner.Graphics
Draw-PandaMark $g 725 280 1.15
$tealPen = New-Pen "#12c99a" 5
$goldPen = New-Pen "#f6b13d" 4
for ($i = 0; $i -lt 17; $i++) {
  $x = 60 + $i * 26
  $height = 25 + (($i * 37) % 110)
  if ($i % 3 -eq 0) {
    $g.DrawLine($goldPen, $x, 356 - $height / 2, $x, 356 + $height / 2)
  } else {
    $g.DrawLine($tealPen, $x, 356 - $height / 2, $x, 356 + $height / 2)
  }
}
$brandFont = New-Font 76 ([System.Drawing.FontStyle]::Bold)
$tagFont = New-Font 25 ([System.Drawing.FontStyle]::Bold)
$smallFont = New-Font 19
Draw-Text $g "CueForge" $brandFont $white 64 118
Draw-Text $g "PANDA LAB FOR FPS AUDIO" $tagFont $teal 70 205
Draw-Text $g "IEM tuning  |  mic checks  |  match evidence  |  Equalizer APO" $smallFont $muted 72 252
Draw-Text $g "Real players. Real setups. No fake activity." $smallFont $gold 72 290
$g.Dispose()
Save-Png $banner.Bitmap (Join-Path $assetDir "cueforge-discord-banner.png")
Copy-Item -LiteralPath (Join-Path $assetDir "cueforge-discord-banner.png") -Destination (Join-Path $assetDir "cueforge-server-wallpaper.png") -Force
$tealPen.Dispose()
$goldPen.Dispose()
$brandFont.Dispose()
$tagFont.Dispose()
$smallFont.Dispose()

$header = New-Canvas 1500 500
$g = $header.Graphics
Draw-PandaMark $g 1240 250 1.05
$brandFont = New-Font 82 ([System.Drawing.FontStyle]::Bold)
$tagFont = New-Font 30 ([System.Drawing.FontStyle]::Bold)
$smallFont = New-Font 22
Draw-Text $g "CueForge" $brandFont $white 92 126
Draw-Text $g "FPS AUDIO TEST LAB" $tagFont $teal 98 222
Draw-Text $g "Tune IEMs, clean up mics, collect match proof, and stop guessing." $smallFont $muted 100 274
Draw-Text $g "p4nd4907.github.io/cueforge" $smallFont $gold 100 330
$g.Dispose()
Save-Png $header.Bitmap (Join-Path $assetDir "cueforge-profile-header.png")
$brandFont.Dispose()
$tagFont.Dispose()
$smallFont.Dispose()

$card = New-Canvas 1200 630
$g = $card.Graphics
Draw-PandaMark $g 910 328 1.18
$brandFont = New-Font 78 ([System.Drawing.FontStyle]::Bold)
$tagFont = New-Font 30 ([System.Drawing.FontStyle]::Bold)
$smallFont = New-Font 22
Draw-Text $g "CueForge" $brandFont $white 76 156
Draw-Text $g "Panda Lab for FPS Audio" $tagFont $teal 82 246
Draw-Text $g "IEM/headset tuning, mic checks, match reports, APO exports." $smallFont $muted 84 310
Draw-Text $g "Open beta: p4nd4907.github.io/cueforge" $smallFont $gold 84 370
$g.Dispose()
Save-Png $card.Bitmap (Join-Path $assetDir "cueforge-social-card.png")
$brandFont.Dispose()
$tagFont.Dispose()
$smallFont.Dispose()

$white.Dispose()
$teal.Dispose()
$gold.Dispose()
$muted.Dispose()

Get-ChildItem -Path $assetDir | Select-Object Name, Length

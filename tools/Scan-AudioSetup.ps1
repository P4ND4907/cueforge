param(
  [string]$OutFile = "$PSScriptRoot\cueforge-audio-setup-report.json"
)

$ErrorActionPreference = "SilentlyContinue"

function Test-PathAny {
  param([string[]]$Paths)
  foreach ($Path in $Paths) {
    if (Test-Path -LiteralPath $Path) {
      return $Path
    }
  }
  return $null
}

$soundDevices = Get-CimInstance Win32_SoundDevice | Select-Object Name, Manufacturer, Status, DeviceID
$mediaPnP = Get-CimInstance Win32_PnPEntity |
  Where-Object { $_.PNPClass -in @("AudioEndpoint", "MEDIA") -or $_.Name -match "HyperX|USB Audio|Headset|Headphone|DAC|Microphone|IEM" } |
  Select-Object Name, Manufacturer, Status, PNPClass, DeviceID

$equalizerApoPath = Test-PathAny @(
  "$env:ProgramFiles\EqualizerAPO",
  "${env:ProgramFiles(x86)}\EqualizerAPO"
)

$peacePath = Test-PathAny @(
  "$env:ProgramFiles\EqualizerAPO\config\Peace.exe",
  "${env:ProgramFiles(x86)}\EqualizerAPO\config\Peace.exe"
)

$sonarPath = Test-PathAny @(
  "$env:ProgramFiles\SteelSeries\GG\SteelSeriesGG.exe",
  "${env:ProgramFiles(x86)}\SteelSeries\GG\SteelSeriesGG.exe",
  "$env:LOCALAPPDATA\Programs\steelseries-gg-client\SteelSeries GG.exe"
)

$apoConfig = Test-PathAny @(
  "$env:ProgramFiles\EqualizerAPO\config\config.txt",
  "${env:ProgramFiles(x86)}\EqualizerAPO\config\config.txt"
)

$report = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  computer = $env:COMPUTERNAME
  user = $env:USERNAME
  tools = [ordered]@{
    equalizerApo = [ordered]@{
      installed = [bool]$equalizerApoPath
      path = $equalizerApoPath
      configPath = $apoConfig
    }
    peace = [ordered]@{
      installed = [bool]$peacePath
      path = $peacePath
    }
    steelSeriesSonar = [ordered]@{
      installed = [bool]$sonarPath
      path = $sonarPath
    }
  }
  soundDevices = $soundDevices
  mediaDevices = $mediaPnP
  matches = [ordered]@{
    hyperx = [bool](($soundDevices + $mediaPnP | Where-Object { $_.Name -match "HyperX|Hyper X" } | Select-Object -First 1))
    iemOrDac = [bool](($soundDevices + $mediaPnP | Where-Object { $_.Name -match "IEM|DAC|USB Audio|Headphone|Headset" } | Select-Object -First 1))
  }
  nextSteps = @(
    "Import this JSON into CueForge > Auto Detect.",
    "Use EQ Studio to export Equalizer APO config text.",
    "Paste the config into Equalizer APO or Peace after confirming your output device."
  )
}

$json = $report | ConvertTo-Json -Depth 6
Set-Content -LiteralPath $OutFile -Value $json -Encoding UTF8
Write-Host "CueForge setup report written to: $OutFile"

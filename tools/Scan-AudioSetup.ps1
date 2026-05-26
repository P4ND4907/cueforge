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

function Get-UninstallMatch {
  param([string[]]$Patterns)
  $registryPaths = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
  )

  foreach ($RegistryPath in $registryPaths) {
    $matches = Get-ItemProperty $RegistryPath |
      Where-Object {
        $DisplayName = $_.DisplayName
        $Patterns | Where-Object { $DisplayName -match $_ }
      } |
      Select-Object DisplayName, DisplayVersion, Publisher -First 1

    if ($matches) {
      return $matches
    }
  }

  return $null
}

function Get-AppxMatch {
  param([string[]]$Patterns)
  $packages = Get-AppxPackage |
    Where-Object {
      $PackageName = "$($_.Name) $($_.PackageFullName)"
      $Patterns | Where-Object { $PackageName -match $_ }
    } |
    Select-Object Name, PackageFullName, Version -First 1

  return $packages
}

function Get-ProcessMatch {
  param([string[]]$Patterns)
  $processes = Get-Process |
    Where-Object {
      $ProcessName = $_.ProcessName
      $Patterns | Where-Object { $ProcessName -match $_ }
    } |
    Select-Object ProcessName -First 1

  return $processes
}

function Test-AudioTool {
  param(
    [string]$Name,
    [string[]]$Paths = @(),
    [string[]]$RegistryPatterns = @(),
    [string[]]$AppxPatterns = @(),
    [string[]]$ProcessPatterns = @()
  )

  $PathMatch = Test-PathAny $Paths
  $RegistryMatch = Get-UninstallMatch $RegistryPatterns
  $AppxMatch = Get-AppxMatch $AppxPatterns
  $ProcessMatch = Get-ProcessMatch $ProcessPatterns
  $Installed = [bool]($PathMatch -or $RegistryMatch -or $AppxMatch -or $ProcessMatch)
  $Source = if ($PathMatch) { "path" } elseif ($RegistryMatch) { "registry" } elseif ($AppxMatch) { "appx" } elseif ($ProcessMatch) { "process" } else { $null }
  $DisplayName = if ($RegistryMatch) { $RegistryMatch.DisplayName } elseif ($AppxMatch) { $AppxMatch.Name } elseif ($ProcessMatch) { $ProcessMatch.ProcessName } else { $Name }
  $Version = if ($RegistryMatch) { $RegistryMatch.DisplayVersion } elseif ($AppxMatch) { $AppxMatch.Version } else { $null }

  return [ordered]@{
    installed = [bool]$Installed
    source = $Source
    displayName = $DisplayName
    version = $Version
    path = $PathMatch
  }
}

function Get-RunningGameMatches {
  $games = @(
    [ordered]@{ id = "tarkov"; name = "Escape from Tarkov"; patterns = @("EscapeFromTarkov", "EscapeFromTarkov_BE") },
    [ordered]@{ id = "siege"; name = "Rainbow Six Siege"; patterns = @("RainbowSix", "RainbowSix_BE") },
    [ordered]@{ id = "cod"; name = "Call of Duty"; patterns = @("cod", "cod22", "cod23", "cod24", "ModernWarfare", "bootstrapper") },
    [ordered]@{ id = "valorant"; name = "Valorant"; patterns = @("VALORANT-Win64-Shipping", "RiotClientServices") },
    [ordered]@{ id = "cs2"; name = "Counter-Strike 2"; patterns = @("cs2") },
    [ordered]@{ id = "apex"; name = "Apex Legends"; patterns = @("r5apex") },
    [ordered]@{ id = "fortnite"; name = "Fortnite"; patterns = @("FortniteClient-Win64-Shipping") }
  )

  $found = @()
  foreach ($Game in $games) {
    $match = Get-ProcessMatch $Game.patterns
    if ($match) {
      $found += [ordered]@{
        id = $Game.id
        name = $Game.name
        process = $match.ProcessName
      }
    }
  }

  return $found
}

function Get-SoundMapperDefaults {
  $mapperPath = "HKCU:\Software\Microsoft\Multimedia\Sound Mapper"
  $mapper = Get-ItemProperty -LiteralPath $mapperPath

  return [ordered]@{
    playback = if ($mapper) { $mapper.Playback } else { $null }
    recording = if ($mapper) { $mapper.Record } else { $null }
    communicationsPlayback = $null
    communicationsRecording = $null
    source = if ($mapper) { "HKCU Sound Mapper" } else { "unavailable" }
  }
}

function Get-AppSessionHints {
  $apps = @(
    [ordered]@{ app = "Discord"; kind = "communication-app"; patterns = @("Discord", "DiscordCanary", "DiscordPTB") },
    [ordered]@{ app = "OBS Studio"; kind = "communication-app"; patterns = @("obs64", "obs32", "obs") },
    [ordered]@{ app = "TeamSpeak"; kind = "communication-app"; patterns = @("ts3client_win64", "ts3client_win32", "TeamSpeak") },
    [ordered]@{ app = "Mumble"; kind = "communication-app"; patterns = @("mumble") },
    [ordered]@{ app = "Steam Voice"; kind = "communication-app"; patterns = @("steamwebhelper", "steam") }
  )

  $found = @()
  foreach ($App in $apps) {
    $match = Get-ProcessMatch $App.patterns
    if ($match) {
      $found += [ordered]@{
        app = $App.app
        kind = $App.kind
        processName = $match.ProcessName
        active = $true
        endpoint = $null
      }
    }
  }

  return $found
}

$soundDevices = Get-CimInstance Win32_SoundDevice | Select-Object Name, Manufacturer, Status, DeviceID
$mediaPnP = Get-CimInstance Win32_PnPEntity |
  Where-Object { $_.PNPClass -in @("AudioEndpoint", "MEDIA") -or $_.Name -match "HyperX|USB Audio|Headset|Headphone|DAC|Microphone|IEM|Sonar|FxSound|THX|Dolby|DTS|Nahimic|Wave Link|Voicemod|Broadcast" } |
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

$voicemeeterPath = Test-PathAny @(
  "$env:ProgramFiles\VB\Voicemeeter\voicemeeter8.exe",
  "$env:ProgramFiles\VB\Voicemeeter\voicemeeterpro.exe",
  "$env:ProgramFiles\VB\Voicemeeter\voicemeeter.exe",
  "${env:ProgramFiles(x86)}\VB\Voicemeeter\voicemeeter8.exe",
  "${env:ProgramFiles(x86)}\VB\Voicemeeter\voicemeeterpro.exe",
  "${env:ProgramFiles(x86)}\VB\Voicemeeter\voicemeeter.exe"
)

$vbCableDevice = ($soundDevices + $mediaPnP | Where-Object { $_.Name -match "VB-Audio|VB-Cable|CABLE Input|CABLE Output|Voicemeeter" } | Select-Object -First 1)

$apoConfig = Test-PathAny @(
  "$env:ProgramFiles\EqualizerAPO\config\config.txt",
  "${env:ProgramFiles(x86)}\EqualizerAPO\config\config.txt"
)

$fxSound = Test-AudioTool -Name "FxSound" `
  -Paths @("$env:ProgramFiles\FxSound\FxSound.exe", "${env:ProgramFiles(x86)}\FxSound\FxSound.exe", "$env:LOCALAPPDATA\Programs\FxSound\FxSound.exe") `
  -RegistryPatterns @("FxSound") `
  -ProcessPatterns @("FxSound")

$razerThx = Test-AudioTool -Name "Razer THX / Synapse" `
  -Paths @("$env:ProgramFiles\Razer\THXSpatialAudio\THXHelper.exe", "$env:ProgramFiles\Razer\Synapse3\Service\Razer Synapse Service.exe", "${env:ProgramFiles(x86)}\Razer\THXSpatialAudio\THXHelper.exe") `
  -RegistryPatterns @("Razer.*THX", "THX.*Spatial", "Razer Synapse") `
  -ProcessPatterns @("THX", "Razer Synapse", "RazerAppEngine")

$dolbyAccess = Test-AudioTool -Name "Dolby Access / Atmos" `
  -RegistryPatterns @("Dolby Access", "Dolby Atmos") `
  -AppxPatterns @("DolbyLaboratories.DolbyAccess", "Dolby") `
  -ProcessPatterns @("Dolby")

$dtsSoundUnbound = Test-AudioTool -Name "DTS Sound Unbound" `
  -RegistryPatterns @("DTS Sound Unbound", "DTS") `
  -AppxPatterns @("DTSInc.DTSSoundUnbound", "DTS") `
  -ProcessPatterns @("DTS")

$nahimic = Test-AudioTool -Name "Nahimic" `
  -RegistryPatterns @("Nahimic", "A-Volute") `
  -AppxPatterns @("Nahimic", "A-Volute") `
  -ProcessPatterns @("Nahimic", "A-Volute")

$realtekAudio = Test-AudioTool -Name "Realtek Audio Console" `
  -RegistryPatterns @("Realtek.*Audio", "Realtek Audio Console") `
  -AppxPatterns @("RealtekSemiconductorCorp.RealtekAudioControl", "Realtek") `
  -ProcessPatterns @("RtkAudUService", "RAVCpl", "Realtek")

$nvidiaBroadcast = Test-AudioTool -Name "NVIDIA Broadcast" `
  -Paths @("$env:ProgramFiles\NVIDIA Corporation\NVIDIA Broadcast\NVIDIA Broadcast.exe") `
  -RegistryPatterns @("NVIDIA Broadcast") `
  -ProcessPatterns @("NVIDIA Broadcast", "NVIDIA Broadcast UI")

$elgatoWaveLink = Test-AudioTool -Name "Elgato Wave Link" `
  -Paths @("$env:ProgramFiles\Elgato\WaveLink\WaveLink.exe", "${env:ProgramFiles(x86)}\Elgato\WaveLink\WaveLink.exe") `
  -RegistryPatterns @("Wave Link", "Elgato") `
  -ProcessPatterns @("WaveLink", "Wave Link")

$logitechGHub = Test-AudioTool -Name "Logitech G HUB" `
  -Paths @("$env:ProgramFiles\LGHUB\lghub.exe", "$env:LOCALAPPDATA\LGHUB\lghub.exe") `
  -RegistryPatterns @("Logitech G HUB", "LGHUB") `
  -ProcessPatterns @("lghub", "lghub_agent")

$corsairIcue = Test-AudioTool -Name "Corsair iCUE" `
  -Paths @("$env:ProgramFiles\Corsair\Corsair iCUE5 Software\iCUE.exe", "$env:ProgramFiles\Corsair\CORSAIR iCUE 4 Software\iCUE.exe") `
  -RegistryPatterns @("Corsair iCUE", "CORSAIR iCUE") `
  -ProcessPatterns @("iCUE")

$voicemod = Test-AudioTool -Name "Voicemod" `
  -Paths @("$env:LOCALAPPDATA\Programs\Voicemod Desktop\VoicemodDesktop.exe") `
  -RegistryPatterns @("Voicemod") `
  -ProcessPatterns @("Voicemod", "VoicemodDesktop")

$discord = Test-AudioTool -Name "Discord" `
  -Paths @("$env:LOCALAPPDATA\Discord\Update.exe", "$env:LOCALAPPDATA\DiscordCanary\Update.exe", "$env:LOCALAPPDATA\DiscordPTB\Update.exe") `
  -RegistryPatterns @("Discord") `
  -ProcessPatterns @("Discord", "DiscordCanary", "DiscordPTB")

$runningGames = Get-RunningGameMatches
$defaults = Get-SoundMapperDefaults
$appSessions = Get-AppSessionHints
$chatGameSplit = [bool](($soundDevices + $mediaPnP | Where-Object { $_.Name -match "(Game|Gaming)" } | Select-Object -First 1) -and (($soundDevices + $mediaPnP | Where-Object { $_.Name -match "(Chat|Communications|Hands-Free|Handsfree)" } | Select-Object -First 1)))

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
    fxSound = $fxSound
    razerThx = $razerThx
    dolbyAccess = $dolbyAccess
    dtsSoundUnbound = $dtsSoundUnbound
    nahimic = $nahimic
    realtekAudio = $realtekAudio
    nvidiaBroadcast = $nvidiaBroadcast
    discord = $discord
    elgatoWaveLink = $elgatoWaveLink
    logitechGHub = $logitechGHub
    corsairIcue = $corsairIcue
    voicemod = $voicemod
    voicemeeter = [ordered]@{
      installed = [bool]$voicemeeterPath
      path = $voicemeeterPath
    }
    vbCable = [ordered]@{
      installed = [bool]$vbCableDevice
      device = $(if ($vbCableDevice) { $vbCableDevice.Name } else { $null })
    }
  }
  soundDevices = $soundDevices
  mediaDevices = $mediaPnP
  defaults = $defaults
  sessions = @(@($appSessions) + @($runningGames | ForEach-Object {
    [ordered]@{
      app = $_.name
      kind = "game-app"
      processName = $_.process
      active = $true
      endpoint = $null
    }
  }))
  effectsDiscovery = [ordered]@{
    model = "installed-tool-and-endpoint-evidence"
    canReadInstalledTools = $true
    canReadEndpointInventory = $true
    canReadDefaultMultimediaEndpoint = [bool]$defaults.playback
    canReadDefaultCommunicationsEndpoint = $false
    canModifySystemState = $false
    note = "CueForge models APO/effects discovery as evidence only. It does not silently install drivers, change defaults, or attach APO to endpoints."
  }
  runningGames = $runningGames
  matches = [ordered]@{
    hyperx = [bool](($soundDevices + $mediaPnP | Where-Object { $_.Name -match "HyperX|Hyper X" } | Select-Object -First 1))
    iemOrDac = [bool](($soundDevices + $mediaPnP | Where-Object { $_.Name -match "IEM|DAC|USB Audio|Headphone|Headset" } | Select-Object -First 1))
    virtualRouting = [bool]$vbCableDevice
    chatGameSplit = $chatGameSplit
    companionAudioLayer = [bool]($sonarPath -or $fxSound['installed'] -or $razerThx['installed'] -or $dolbyAccess['installed'] -or $dtsSoundUnbound['installed'] -or $nahimic['installed'] -or $nvidiaBroadcast['installed'] -or $discord['installed'] -or $elgatoWaveLink['installed'] -or $logitechGHub['installed'] -or $corsairIcue['installed'] -or $voicemod['installed'])
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

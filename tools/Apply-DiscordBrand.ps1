param(
  [string]$EnvPath = "",
  [string]$IconPath = "",
  [string]$BannerPath = "",
  [string]$Name = "CueForge Beta",
  [string]$Description = "FPS audio testing for real players: IEM/headset EQ, mic checks, match evidence, Discord setup, and Equalizer APO exports.",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\.."

if (-not $EnvPath) {
  $candidate = Join-Path $root "discord-bot\.env"
  if (Test-Path $candidate) {
    $EnvPath = $candidate
  } else {
    $candidate = Join-Path $root ".env"
    if (Test-Path $candidate) { $EnvPath = $candidate }
  }
}

if (-not $IconPath) {
  $IconPath = Join-Path $root "assets\discord\cueforge-discord-icon.png"
}

if (-not $BannerPath) {
  $BannerPath = Join-Path $root "assets\discord\cueforge-discord-banner.png"
}

function Read-DotEnv([string]$Path) {
  if (-not $Path -or -not (Test-Path $Path)) {
    throw "No .env file found. Copy discord-bot/.env.example to discord-bot/.env and fill DISCORD_TOKEN and DISCORD_GUILD_ID."
  }

  $values = @{}
  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
    $key, $value = $line.Split("=", 2)
    $values[$key.Trim()] = $value.Trim().Trim('"').Trim("'")
  }
  return $values
}

function ConvertTo-DataUri([string]$Path) {
  if (-not (Test-Path $Path)) { throw "Asset missing: $Path" }
  $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $Path))
  $encoded = [Convert]::ToBase64String($bytes)
  return "data:image/png;base64,$encoded"
}

function Invoke-DiscordPatch($Token, $GuildId, $Body) {
  $json = $Body | ConvertTo-Json -Depth 8
  if ($DryRun) {
    return @{
      dryRun = $true
      fields = @($Body.Keys)
    }
  }

  return Invoke-RestMethod `
    -Method Patch `
    -Uri "https://discord.com/api/v10/guilds/$GuildId" `
    -Headers @{ Authorization = "Bot $Token"; "Content-Type" = "application/json" } `
    -Body $json
}

$envValues = Read-DotEnv $EnvPath
$token = $envValues["DISCORD_TOKEN"]
$guildId = $envValues["DISCORD_GUILD_ID"]

if (-not $token) { throw "DISCORD_TOKEN is missing in $EnvPath." }
if (-not $guildId) { throw "DISCORD_GUILD_ID is missing in $EnvPath." }

$iconUri = ConvertTo-DataUri $IconPath
$profileResult = Invoke-DiscordPatch $token $guildId @{
  name = $Name
  description = $Description
  icon = $iconUri
}

Write-Host "Updated server name, description, and icon."

try {
  $bannerUri = ConvertTo-DataUri $BannerPath
  $bannerResult = Invoke-DiscordPatch $token $guildId @{ banner = $bannerUri }
  Write-Host "Updated server banner."
} catch {
  Write-Warning "Banner update did not complete. Discord may require server boost/banner support or Manage Guild permission. $($_.Exception.Message)"
}

Write-Host "Done. Token was not printed."

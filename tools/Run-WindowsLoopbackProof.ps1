param(
  [switch]$Capture,
  [string]$OutFile = "$PSScriptRoot\..\docs\repair\windows-loopback-proof.json",
  [int]$DurationMs = 2400
)

$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT') {
  throw 'Windows WASAPI loopback proof requires Windows.'
}

$wasapiSource = @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;

public static class CueForgeWasapiLoopback
{
    private const int AudclntSharemodeShared = 0;
    private const int AudclntStreamflagsLoopback = 0x00020000;
    private const uint AudclntBufferflagsSilent = 0x00000002;
    private const int ClsctxAll = 0x17;

    private enum DataFlow { Render = 0, Capture = 1, All = 2 }
    private enum Role { Console = 0, Multimedia = 1, Communications = 2 }

    [StructLayout(LayoutKind.Sequential, Pack = 2)]
    private struct WaveFormat
    {
        public ushort FormatTag;
        public ushort Channels;
        public uint SamplesPerSec;
        public uint AvgBytesPerSec;
        public ushort BlockAlign;
        public ushort BitsPerSample;
        public ushort ExtraSize;
    }

    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E"), ClassInterface(ClassInterfaceType.None)]
    private class MMDeviceEnumerator { }

    [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IMMDeviceEnumerator
    {
        [PreserveSig] int EnumAudioEndpoints(DataFlow flow, uint stateMask, out object devices);
        [PreserveSig] int GetDefaultAudioEndpoint(DataFlow flow, Role role, out IMMDevice device);
        [PreserveSig] int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string id, out IMMDevice device);
        [PreserveSig] int RegisterEndpointNotificationCallback(IntPtr client);
        [PreserveSig] int UnregisterEndpointNotificationCallback(IntPtr client);
    }

    [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IMMDevice
    {
        [PreserveSig] int Activate(ref Guid iid, int clsContext, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object instance);
        [PreserveSig] int OpenPropertyStore(int access, out object properties);
        [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
        [PreserveSig] int GetState(out uint state);
    }

    [ComImport, Guid("1CB9AD4C-DBFA-4C32-B178-C2F568A703B2"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IAudioClient
    {
        [PreserveSig] int Initialize(int shareMode, int streamFlags, long bufferDuration, long periodicity, IntPtr format, ref Guid sessionGuid);
        [PreserveSig] int GetBufferSize(out uint frames);
        [PreserveSig] int GetStreamLatency(out long latency);
        [PreserveSig] int GetCurrentPadding(out uint padding);
        [PreserveSig] int IsFormatSupported(int shareMode, IntPtr format, out IntPtr closest);
        [PreserveSig] int GetMixFormat(out IntPtr format);
        [PreserveSig] int GetDevicePeriod(out long defaultPeriod, out long minimumPeriod);
        [PreserveSig] int Start();
        [PreserveSig] int Stop();
        [PreserveSig] int Reset();
        [PreserveSig] int SetEventHandle(IntPtr handle);
        [PreserveSig] int GetService(ref Guid iid, [MarshalAs(UnmanagedType.IUnknown)] out object service);
    }

    [ComImport, Guid("C8ADBD64-E71E-48A0-A4DE-185C395CD317"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IAudioCaptureClient
    {
        [PreserveSig] int GetBuffer(out IntPtr data, out uint frames, out uint flags, out ulong devicePosition, out ulong qpcPosition);
        [PreserveSig] int ReleaseBuffer(uint frames);
        [PreserveSig] int GetNextPacketSize(out uint frames);
    }

    public sealed class Result
    {
        public string schema { get; set; }
        public string status { get; set; }
        public string endpointHash { get; set; }
        public int sampleRate { get; set; }
        public int channels { get; set; }
        public int bitsPerSample { get; set; }
        public long frames { get; set; }
        public double durationMs { get; set; }
        public double rms { get; set; }
        public double rmsDbfs { get; set; }
        public double peak { get; set; }
        public double peakDbfs { get; set; }
        public double leftRightCorrelation { get; set; }
        public double bodyAmplitude { get; set; }
        public double cueAmplitude { get; set; }
        public double commsAmplitude { get; set; }
        public bool nonSilent { get; set; }
        public bool clipped { get; set; }
        public string error { get; set; }
    }

    public static Result Capture(int durationMs)
    {
        var result = new Result { schema = "cueforge.wasapi-loopback-capture.v1", status = "failed" };
        object enumeratorObject = null;
        object clientObject = null;
        object captureObject = null;
        IntPtr formatPointer = IntPtr.Zero;
        try
        {
            enumeratorObject = new MMDeviceEnumerator();
            var enumerator = (IMMDeviceEnumerator)enumeratorObject;
            IMMDevice device;
            Check(enumerator.GetDefaultAudioEndpoint(DataFlow.Render, Role.Console, out device), "GetDefaultAudioEndpoint");
            string endpointId;
            Check(device.GetId(out endpointId), "GetId");
            result.endpointHash = HashEndpoint(endpointId);

            var clientIid = typeof(IAudioClient).GUID;
            Check(device.Activate(ref clientIid, ClsctxAll, IntPtr.Zero, out clientObject), "ActivateAudioClient");
            var client = (IAudioClient)clientObject;
            Check(client.GetMixFormat(out formatPointer), "GetMixFormat");
            var format = Marshal.PtrToStructure<WaveFormat>(formatPointer);
            result.sampleRate = checked((int)format.SamplesPerSec);
            result.channels = format.Channels;
            result.bitsPerSample = format.BitsPerSample;

            var sessionGuid = Guid.Empty;
            Check(client.Initialize(AudclntSharemodeShared, AudclntStreamflagsLoopback, 1000000, 0, formatPointer, ref sessionGuid), "InitializeLoopback");
            var captureIid = typeof(IAudioCaptureClient).GUID;
            Check(client.GetService(ref captureIid, out captureObject), "GetCaptureService");
            var capture = (IAudioCaptureClient)captureObject;
            var left = new List<float>();
            var right = new List<float>();
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            Check(client.Start(), "StartLoopback");
            try
            {
                while (stopwatch.ElapsedMilliseconds < Math.Max(500, durationMs))
                {
                    uint packetFrames;
                    if (capture.GetNextPacketSize(out packetFrames) != 0 || packetFrames == 0)
                    {
                        Thread.Sleep(5);
                        continue;
                    }

                    IntPtr data;
                    uint frames;
                    uint flags;
                    ulong devicePosition;
                    ulong qpcPosition;
                    Check(capture.GetBuffer(out data, out frames, out flags, out devicePosition, out qpcPosition), "GetBuffer");
                    var bytesPerSample = Math.Max(1, (int)format.BlockAlign / Math.Max(1, (int)format.Channels));
                    var bytes = checked((int)(frames * format.BlockAlign));
                    var raw = new byte[bytes];
                    if ((flags & AudclntBufferflagsSilent) == 0) Marshal.Copy(data, raw, 0, bytes);
                    for (var frame = 0; frame < frames; frame++)
                    {
                        var leftValue = (flags & AudclntBufferflagsSilent) != 0
                            ? 0f
                            : ReadSample(raw, frame * format.BlockAlign, format.BitsPerSample, format.FormatTag, bytesPerSample);
                        var rightValue = format.Channels > 1
                            ? ((flags & AudclntBufferflagsSilent) != 0
                                ? 0f
                                : ReadSample(raw, frame * format.BlockAlign + bytesPerSample, format.BitsPerSample, format.FormatTag, bytesPerSample))
                            : leftValue;
                        left.Add(leftValue);
                        right.Add(rightValue);
                    }
                    Check(capture.ReleaseBuffer(frames), "ReleaseBuffer");
                }
            }
            finally
            {
                client.Stop();
            }

            result.frames = left.Count;
            result.durationMs = stopwatch.Elapsed.TotalMilliseconds;
            if (left.Count == 0) throw new InvalidOperationException("No loopback frames arrived from the default render endpoint.");
            result.rms = Rms(left);
            result.rmsDbfs = Db(result.rms);
            result.peak = Peak(left);
            result.peakDbfs = Db(result.peak);
            result.leftRightCorrelation = Correlation(left, right);
            result.bodyAmplitude = Tone(left, result.sampleRate, 180);
            result.commsAmplitude = Tone(left, result.sampleRate, 1000);
            result.cueAmplitude = Tone(left, result.sampleRate, 4000);
            result.nonSilent = result.rms > 0.0005 && result.peak > 0.002;
            result.clipped = result.peak >= 0.99;
            result.status = "pass";
            return result;
        }
        catch (Exception error)
        {
            result.error = error.Message;
            return result;
        }
        finally
        {
            if (formatPointer != IntPtr.Zero) Marshal.FreeCoTaskMem(formatPointer);
            if (captureObject != null && Marshal.IsComObject(captureObject)) Marshal.ReleaseComObject(captureObject);
            if (clientObject != null && Marshal.IsComObject(clientObject)) Marshal.ReleaseComObject(clientObject);
            if (enumeratorObject != null && Marshal.IsComObject(enumeratorObject)) Marshal.ReleaseComObject(enumeratorObject);
        }
    }

    private static void Check(int code, string operation)
    {
        if (code != 0) throw new COMException(operation + " failed: 0x" + code.ToString("X8"), code);
    }

    private static float ReadSample(byte[] data, int offset, int bits, ushort formatTag, int bytesPerSample)
    {
        if (bits == 32 && bytesPerSample >= 4 && (formatTag == 3 || formatTag == 0xFFFE)) return BitConverter.ToSingle(data, offset);
        if (bits == 16 && bytesPerSample >= 2) return BitConverter.ToInt16(data, offset) / 32768f;
        if (bits == 24 && bytesPerSample >= 3)
        {
            var value = data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16);
            if ((value & 0x800000) != 0) value |= unchecked((int)0xFF000000);
            return value / 8388608f;
        }
        if (bits == 32 && bytesPerSample >= 4) return BitConverter.ToInt32(data, offset) / 2147483648f;
        return 0f;
    }

    private static double Rms(List<float> values)
    {
        double sum = 0;
        foreach (var value in values) sum += value * value;
        return Math.Sqrt(sum / Math.Max(1, values.Count));
    }

    private static double Peak(List<float> values)
    {
        var peak = 0f;
        foreach (var value in values) peak = Math.Max(peak, Math.Abs(value));
        return peak;
    }

    private static double Correlation(List<float> left, List<float> right)
    {
        double cross = 0, leftEnergy = 0, rightEnergy = 0;
        var count = Math.Min(left.Count, right.Count);
        for (var index = 0; index < count; index++)
        {
            cross += left[index] * right[index];
            leftEnergy += left[index] * left[index];
            rightEnergy += right[index] * right[index];
        }
        return cross / Math.Sqrt(Math.Max(1e-12, leftEnergy * rightEnergy));
    }

    private static double Tone(List<float> values, int sampleRate, double frequency)
    {
        double cosine = 0, sine = 0;
        for (var index = 0; index < values.Count; index++)
        {
            var phase = 2 * Math.PI * frequency * index / sampleRate;
            cosine += values[index] * Math.Cos(phase);
            sine += values[index] * Math.Sin(phase);
        }
        return 2 * Math.Sqrt(cosine * cosine + sine * sine) / Math.Max(1, values.Count);
    }

    private static double Db(double linear)
    {
        return linear <= 1e-9 ? -120 : 20 * Math.Log10(linear);
    }

    private static string HashEndpoint(string endpointId)
    {
        using (var sha = SHA256.Create())
        {
            var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(endpointId ?? "unknown"));
            var builder = new StringBuilder("ep_");
            for (var index = 0; index < 6; index++) builder.Append(bytes[index].ToString("x2"));
            return builder.ToString();
        }
    }
}
'@

Add-Type -TypeDefinition $wasapiSource -Language CSharp

function Write-Utf8Json {
  param([string]$Path, [object]$Value)
  $json = $Value | ConvertTo-Json -Depth 8
  [System.IO.File]::WriteAllText($Path, $json, [System.Text.UTF8Encoding]::new($false))
}

if ($Capture) {
  $result = [CueForgeWasapiLoopback]::Capture($DurationMs)
  Write-Utf8Json -Path $OutFile -Value $result
  exit 0
}

$workingDirectory = Join-Path $env:TEMP ("cueforge-loopback-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $workingDirectory | Out-Null
$baselineWave = Join-Path $workingDirectory 'baseline.wav'
$tunedWave = Join-Path $workingDirectory 'tuned.wav'
$baselineJson = Join-Path $workingDirectory 'baseline.json'
$tunedJson = Join-Path $workingDirectory 'tuned.json'

function New-TestToneWave {
  param([string]$Path, [bool]$BoostCue)
  $sampleRate = 48000
  $channels = 2
  $bits = 16
  $frames = 86400
  $dataBytes = $frames * $channels * 2
  $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Create)
  $writer = [System.IO.BinaryWriter]::new($stream)
  try {
    $writer.Write([System.Text.Encoding]::ASCII.GetBytes('RIFF'))
    $writer.Write([int](36 + $dataBytes))
    $writer.Write([System.Text.Encoding]::ASCII.GetBytes('WAVEfmt '))
    $writer.Write([int]16)
    $writer.Write([int16]1)
    $writer.Write([int16]$channels)
    $writer.Write([int]$sampleRate)
    $writer.Write([int]($sampleRate * $channels * 2))
    $writer.Write([int16]($channels * 2))
    $writer.Write([int16]$bits)
    $writer.Write([System.Text.Encoding]::ASCII.GetBytes('data'))
    $writer.Write([int]$dataBytes)
    $cueGain = if ($BoostCue) { 0.075 } else { 0.053 }
    for ($frame = 0; $frame -lt $frames; $frame++) {
      $time = $frame / $sampleRate
      $value = (0.12 * [math]::Sin(2 * [math]::PI * 180 * $time)) +
        (0.08 * [math]::Sin(2 * [math]::PI * 1000 * $time)) +
        ($cueGain * [math]::Sin(2 * [math]::PI * 4000 * $time))
      $sample = [int16]([math]::Round([math]::Max(-0.95, [math]::Min(0.95, $value)) * 32767))
      $writer.Write($sample)
      $writer.Write($sample)
    }
  } finally {
    $writer.Dispose()
    $stream.Dispose()
  }
}

function Invoke-Capture {
  param([string]$Output)
  $args = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath, '-Capture', '-OutFile', $Output, '-DurationMs', $DurationMs)
  return Start-Process -FilePath 'powershell.exe' -ArgumentList $args -WindowStyle Hidden -PassThru
}

function Play-Wave {
  param([string]$Path)
  $player = [System.Media.SoundPlayer]::new($Path)
  try {
    $player.Load()
    $player.PlaySync()
  } finally {
    $player.Dispose()
  }
}

New-TestToneWave -Path $baselineWave -BoostCue:$false
New-TestToneWave -Path $tunedWave -BoostCue:$true

$baselineProcess = Invoke-Capture -Output $baselineJson
Start-Sleep -Milliseconds 250
Play-Wave -Path $baselineWave
$baselineProcess.WaitForExit(10000) | Out-Null

$tunedProcess = Invoke-Capture -Output $tunedJson
Start-Sleep -Milliseconds 250
Play-Wave -Path $tunedWave
$tunedProcess.WaitForExit(10000) | Out-Null

$baseline = Get-Content -LiteralPath $baselineJson -Raw | ConvertFrom-Json
$tuned = Get-Content -LiteralPath $tunedJson -Raw | ConvertFrom-Json
$cueGainDb = if ($baseline.cueAmplitude -gt 0) { 20 * [math]::Log10($tuned.cueAmplitude / $baseline.cueAmplitude) } else { -120 }
$loudnessDeltaDb = $tuned.rmsDbfs - $baseline.rmsDbfs
$status = if (
  $baseline.status -eq 'pass' -and $tuned.status -eq 'pass' -and
  $baseline.nonSilent -and $tuned.nonSilent -and
  $cueGainDb -ge 1.0 -and $cueGainDb -le 4.5 -and
  $tuned.leftRightCorrelation -ge 0.95 -and
  -1.0 -le $loudnessDeltaDb -and $loudnessDeltaDb -le 3.0 -and
  -not $baseline.clipped -and -not $tuned.clipped
) { 'pass' } else { 'fail' }

$proof = [ordered]@{
  schema = 'cueforge.windows-loopback-regression.v1'
  status = $status
  capturedAt = (Get-Date).ToString('o')
  endpointHash = $tuned.endpointHash
  sampleRate = $tuned.sampleRate
  channels = $tuned.channels
  baseline = $baseline
  tuned = $tuned
  deltas = [ordered]@{
    cueGainDb = [math]::Round($cueGainDb, 3)
    loudnessDeltaDb = [math]::Round($loudnessDeltaDb, 3)
    phaseCorrelation = [math]::Round($tuned.leftRightCorrelation, 5)
  }
  policy = [ordered]@{
    cueGainDb = '1.0..4.5'
    loudnessDeltaDb = '-1.0..3.0'
    phaseCorrelation = '>=0.95'
    clipping = 'false'
  }
  safety = @(
    'Explicit command and bounded capture window.',
    'Local test tones and derived metrics only.',
    'No raw audio is stored in the proof artifact.',
    'No routing, driver, APO, or default-device changes.'
  )
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutFile) | Out-Null
Write-Utf8Json -Path $OutFile -Value $proof
Write-Host "Windows loopback proof: $status"
Write-Host ("Endpoint {0}; cue gain {1:N2} dB; loudness delta {2:N2} dB; phase {3:N3}; clipping baseline/tuned {4}/{5}" -f $proof.endpointHash, $cueGainDb, $loudnessDeltaDb, $tuned.leftRightCorrelation, $baseline.clipped, $tuned.clipped)
Write-Host "Proof: $OutFile"
if ($status -ne 'pass') { exit 1 }

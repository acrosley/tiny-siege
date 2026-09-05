$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$taskAudio=Join-Path $taskRoot 'artifacts/tutorial'
New-Item -ItemType Directory -Force $taskAudio | Out-Null
Add-Type -AssemblyName System.Speech
$taskSpeaker=New-Object System.Speech.Synthesis.SpeechSynthesizer
$taskSpeaker.Rate=0
$taskChapters=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'tutorial-chapters.json') -Raw | ConvertFrom-Json
for($taskIndex=0;$taskIndex -lt $taskChapters.Count;$taskIndex++){
  $taskSpeaker.SetOutputToWaveFile((Join-Path $taskAudio "voice-$taskIndex.wav"))
  $taskSpeaker.Speak($taskChapters[$taskIndex].speech)
}
$taskSpeaker.Dispose()
Write-Output 'Tutorial narration recorded.'

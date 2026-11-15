# Usage: .\fetch-game.ps1 <slug> [<slug> ...]   e.g. .\fetch-game.ps1 sweet-loot
# Saves page, loader, client JS and a sample doInit/doSpin into .\<slug>\
param([Parameter(Mandatory, ValueFromRemainingArguments)][string[]]$Slugs)
$UA = "Mozilla/5.0"
foreach ($slug in $Slugs) {
  $d = Join-Path $PSScriptRoot $slug; New-Item -ItemType Directory -Force $d | Out-Null
  $page = Invoke-WebRequest "https://www.pragmaticplay.com/en/games/$slug/?gamelang=en&cur=USD" -UseBasicParsing -UserAgent $UA
  $page.Content | Set-Content "$d\page.html" -Encoding utf8
  $src = [Net.WebUtility]::HtmlDecode([regex]::Match($page.Content, 'data-game-src="([^"]+)"').Groups[1].Value)
  if (-not $src) { Write-Warning "$slug : no demo link"; continue }

  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $g = Invoke-WebRequest $src -UseBasicParsing -UserAgent $UA -WebSession $s
  $g.Content | Set-Content "$d\html5Game.html" -Encoding utf8
  $cfg = [regex]::Match($g.Content, "gameConfig: '(\{.*?\})'").Groups[1].Value | ConvertFrom-Json
  $symbol = [regex]::Match($src, 'gameSymbol=([^&]+)').Groups[1].Value

  foreach ($f in "bootstrap.js", "build.js") {
    Invoke-WebRequest "$($cfg.datapath)desktop/$f" -UseBasicParsing -UserAgent $UA -OutFile "$d\$f"
  }

  $h = @{ Referer = $g.BaseResponse.ResponseUri.AbsoluteUri; Origin = "https://demogamesfree.pragmaticplay.net" }
  $post = { param($body) (Invoke-WebRequest $cfg.gameService -Method POST -Headers $h -WebSession $s -Body $body -ContentType "application/x-www-form-urlencoded" -UseBasicParsing -UserAgent $UA).Content }
  $init = & $post "action=doInit&symbol=$symbol&cver=1&index=1&counter=1&repeat=0&mgckey=$($cfg.mgckey)"
  $init | Set-Content "$d\sample_doInit.txt"
  $c = [regex]::Match($init, '(?:^|&)defc=([^&]+)').Groups[1].Value
  $l = [regex]::Match($init, '(?:^|&)l=([^&]+)').Groups[1].Value
  & $post "action=doSpin&symbol=$symbol&c=$c&l=$l&bl=0&index=2&counter=3&repeat=0&mgckey=$($cfg.mgckey)" | Set-Content "$d\sample_doSpin.txt"

  "<!doctype html><html><head><meta charset=utf-8><title>$slug</title><style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style></head><body><iframe allow=`"autoplay; fullscreen`" src=`"$src`"></iframe></body></html>" | Set-Content "$d\play.html" -Encoding utf8
  "$slug  symbol=$symbol  datapath=$($cfg.datapath)"
}

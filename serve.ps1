# Tiny static file server for local testing (the game itself is pure static files)
param([int]$Port = 8340)
$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$Port/"
$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.png'='image/png'; '.svg'='image/svg+xml'; '.json'='application/json'; '.ico'='image/x-icon' }
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $path = [uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($ctx.Request.HttpMethod -eq 'POST' -and $path -eq '/shot') {
      # dev helper: page POSTs a canvas dataURL, we save it as shot.png
      $reader = New-Object IO.StreamReader($ctx.Request.InputStream, $ctx.Request.ContentEncoding)
      $body = $reader.ReadToEnd()
      $b64 = $body -replace '^data:image/\w+;base64,', ''
      [IO.File]::WriteAllBytes((Join-Path $root 'shot.png'), [Convert]::FromBase64String($b64))
      $ctx.Response.StatusCode = 200
      $ctx.Response.Close()
      continue
    }
    if ($path -eq '/') { $path = '/index.html' }
    $file = Join-Path $root ($path.TrimStart('/') -replace '/', '\')
    if ((Test-Path $file -PathType Leaf) -and ([IO.Path]::GetFullPath($file)).StartsWith($root)) {
      $bytes = [IO.File]::ReadAllBytes($file)
      $ext = [IO.Path]::GetExtension($file).ToLower()
      $ct = $mime[$ext]; if (-not $ct) { $ct = 'application/octet-stream' }
      $ctx.Response.ContentType = $ct
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
    $ctx.Response.Close()
  } catch { }
}

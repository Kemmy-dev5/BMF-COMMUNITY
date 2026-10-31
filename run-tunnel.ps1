while ($true) {
  Write-Host "Lancement du tunnel localtunnel..."
  npx localtunnel --port 49807 --subdomain bmf-community-app
  Start-Sleep -Seconds 3
}

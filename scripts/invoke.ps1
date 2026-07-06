# PowerShell script to test invoking the deployed VoteSphere contracts

$ErrorActionPreference = "Stop"

if (-not (Test-Path "./.env")) {
    Write-Error "No .env file found. Run 'npm run contract:deploy' first."
}

# Load .env file
Get-Content "./.env" | Foreach-Object {
    if ($_ -match "^([^=]+)=(.*)$") {
        $name = $Matches[1].Trim()
        $value = $Matches[2].Trim()
        Set-Item -Path "env:\$name" -Value $value
    }
}

$registryId = $env:CONTRACT_REGISTRY_ID
$votingId = $env:CONTRACT_VOTING_ID
$resultsId = $env:CONTRACT_RESULTS_ID

if (-not $registryId) {
    Write-Error "CONTRACT_REGISTRY_ID is not defined in .env"
}

Write-Host "=== Testing Invoke: Listing elections ==="
stellar contract invoke `
    --id $registryId `
    --source admin `
    --network testnet `
    -- `
    list_elections

Write-Host "=== Done invoking! ==="

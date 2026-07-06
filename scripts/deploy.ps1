# PowerShell script to deploy VoteSphere smart contracts to Stellar Testnet

$ErrorActionPreference = "Stop"

# Prepend cargo bin to path so nested cargo calls use correct rustc
$env:PATH = "C:\Users\Arya Bhagat\cargo\bin;C:\Users\Arya Bhagat\.cargo\bin;" + $env:PATH

Write-Host "=== Setting up Stellar Identity for Deployment ==="
# Check if admin key exists
$keys = stellar keys ls
if ($keys -like "*admin*") {
    Write-Host "Identity 'admin' already exists."
} else {
    Write-Host "Creating new identity 'admin' on Testnet..."
    stellar keys generate admin --network testnet
}

Write-Host "Funding identity 'admin' on Testnet..."
try {
    stellar keys fund admin --network testnet
} catch {
    Write-Host "Funding admin identity may have already succeeded or friendbot is rate-limiting. Proceeding..."
}

Write-Host "=== Building contracts ==="
stellar contract build --manifest-path ./contracts/Cargo.toml

Write-Host "=== Deploying ResultContract ==="
$resultContractId = stellar contract deploy `
    --wasm ./contracts/target/wasm32v1-none/release/results.wasm `
    --source admin `
    --network testnet
$resultContractId = $resultContractId.Trim()
Write-Host "ResultContract deployed with ID: $resultContractId"

Write-Host "=== Deploying ElectionRegistryContract ==="
$registryContractId = stellar contract deploy `
    --wasm ./contracts/target/wasm32v1-none/release/election_registry.wasm `
    --source admin `
    --network testnet
$registryContractId = $registryContractId.Trim()
Write-Host "ElectionRegistryContract deployed with ID: $registryContractId"

Write-Host "=== Deploying VotingContract ==="
$votingContractId = stellar contract deploy `
    --wasm ./contracts/target/wasm32v1-none/release/voting.wasm `
    --source admin `
    --network testnet
$votingContractId = $votingContractId.Trim()
Write-Host "VotingContract deployed with ID: $votingContractId"

Write-Host "=== Writing contract IDs to environment files ==="
$envContent = @"
CONTRACT_REGISTRY_ID=$registryContractId
CONTRACT_VOTING_ID=$votingContractId
CONTRACT_RESULTS_ID=$resultContractId
VITE_CONTRACT_REGISTRY_ID=$registryContractId
VITE_CONTRACT_VOTING_ID=$votingContractId
VITE_CONTRACT_RESULTS_ID=$resultContractId
NETWORK_PASSPHRASE=Test SDF Network ; September 2015
RPC_URL=https://soroban-testnet.stellar.org
HORIZON_URL=https://horizon-testnet.stellar.org
VITE_RPC_URL=https://soroban-testnet.stellar.org
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
"@

Set-Content -Path "./.env" -Value $envContent

if (-not (Test-Path "./src")) {
    New-Item -ItemType Directory -Path "./src" | Out-Null
}
Set-Content -Path "./src/.env" -Value $envContent

Write-Host "=== Deployment successful! ==="
Write-Host "Registry ID: $registryContractId"
Write-Host "Voting ID: $votingContractId"
Write-Host "Results ID: $resultContractId"

<#
.SYNOPSIS
    Enterprise Software Documentation Blueprint Scaffolder (PowerShell)
    Tự động hóa khởi tạo toàn bộ hệ thống tài liệu chuẩn mực cho bất kỳ dự án phần mềm nào.

.EXAMPLE
    .\scaffold.ps1 -ProjectName "ShopZen" -Domain "E-Commerce SaaS" -BackendStack "Laravel 13" -FrontendStack "Next.js 15" -DatabaseStack "PostgreSQL 16" -OutputPath "../ShopZen"
#>

param (
    [string]$ProjectName = "MyEnterpriseProject",
    [string]$Domain = "Enterprise Cloud System",
    [string]$BackendStack = "Laravel 13, PHP 8.3-FPM",
    [string]$FrontendStack = "Next.js 15, React 19, TypeScript",
    [string]$DatabaseStack = "PostgreSQL 16",
    [string]$Author = "Architecture & Engineering Team",
    [string]$OutputPath = "./target-project-docs"
)

$SourceDir = $PSScriptRoot
$TargetDir = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$CurrentDate = (Get-Date).ToString("yyyy-MM-dd")

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "🏛️  ENTERPRISE DOCUMENTATION BLUEPRINT GENERATOR (POWERSHELL)" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "📌 Dự án:         $ProjectName" -ForegroundColor White
Write-Host "🌐 Miền nghiệp vụ: $Domain" -ForegroundColor White
Write-Host "⚙️  Backend:       $BackendStack" -ForegroundColor White
Write-Host "💻 Frontend:      $FrontendStack" -ForegroundColor White
Write-Host "🗄️  Database:      $DatabaseStack" -ForegroundColor White
Write-Host "📁 Thư mục đích:  $TargetDir" -ForegroundColor Green
Write-Host "----------------------------------------------------------------`n" -ForegroundColor Cyan

# Kiểm tra Node.js có sẵn không, nếu có gọi scaffold.js
$NodeScript = Join-Path $SourceDir "scaffold.js"
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "Đang gọi Node.js engine để thực thi khởi tạo..." -ForegroundColor DarkGray
    node $NodeScript --name "$ProjectName" --domain "$Domain" --backend "$BackendStack" --frontend "$FrontendStack" --db "$DatabaseStack" --author "$Author" --out "$OutputPath"
    exit
}

# Nếu không có Node.js, thực thi trực tiếp bằng PowerShell
if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

$DocsSource = Join-Path $SourceDir "docs"
$AllFiles = Get-ChildItem -Path $DocsSource -Recurse -File

$Count = 0

foreach ($File in $AllFiles) {
    $RelativePath = $File.FullName.Substring($DocsSource.Length + 1)
    $TargetFileName = $File.Name.Replace(".template.md", ".md")
    $RelativeDir = Split-Path $RelativePath -Parent
    
    $DestFolder = if ($RelativeDir) { Join-Path (Join-Path $TargetDir "docs") $RelativeDir } else { Join-Path $TargetDir "docs" }
    if (-not (Test-Path $DestFolder)) {
        New-Item -ItemType Directory -Path $DestFolder -Force | Out-Null
    }
    
    $DestFile = Join-Path $DestFolder $TargetFileName
    
    $Content = Get-Content -Path $File.FullName -Raw -Encoding UTF8
    $Content = $Content.Replace("{{PROJECT_NAME}}", $ProjectName)
    $Content = $Content.Replace("{{DOMAIN_NAME}}", $Domain)
    $Content = $Content.Replace("{{BACKEND_STACK}}", $BackendStack)
    $Content = $Content.Replace("{{FRONTEND_STACK}}", $FrontendStack)
    $Content = $Content.Replace("{{DATABASE_STACK}}", $DatabaseStack)
    $Content = $Content.Replace("{{AUTHOR}}", $Author)
    $Content = $Content.Replace("{{DATE}}", $CurrentDate)
    
    [System.IO.File]::WriteAllText($DestFile, $Content, [System.Text.Encoding]::UTF8)
    Write-Host "  ✅ [CREATED] docs\$RelativePath -> $TargetFileName" -ForegroundColor DarkGreen
    $Count++
}

# Copy AGENTS.md
$AgentsSrc = Join-Path $SourceDir "AGENTS.template.md"
if (Test-Path $AgentsSrc) {
    $Content = Get-Content -Path $AgentsSrc -Raw -Encoding UTF8
    $Content = $Content.Replace("{{PROJECT_NAME}}", $ProjectName)
    $Content = $Content.Replace("{{DOMAIN_NAME}}", $Domain)
    $Content = $Content.Replace("{{BACKEND_STACK}}", $BackendStack)
    $Content = $Content.Replace("{{FRONTEND_STACK}}", $FrontendStack)
    $Content = $Content.Replace("{{DATABASE_STACK}}", $DatabaseStack)
    $DestFile = Join-Path $TargetDir "AGENTS.md"
    [System.IO.File]::WriteAllText($DestFile, $Content, [System.Text.Encoding]::UTF8)
    Write-Host "  ✅ [CREATED] AGENTS.md" -ForegroundColor DarkGreen
    $Count++
}

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "🎉 THÀNH CÔNG! Đã khởi tạo hoàn tất $Count tệp tài liệu kỹ thuật." -ForegroundColor Green
Write-Host "📂 Vị trí: $TargetDir" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan

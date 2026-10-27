#!/usr/bin/env node

/**
 * 🏛️ Enterprise Software Documentation Blueprint Scaffolder
 * Tự động hóa khởi tạo toàn bộ hệ thống tài liệu chuẩn mực cho bất kỳ dự án phần mềm nào.
 * 
 * Cách dùng:
 *   node scaffold.js --name "ShopZen" --domain "E-Commerce SaaS" --backend "Laravel 13" --frontend "Next.js 15" --db "PostgreSQL 16" --out "../ShopZen"
 */

const fs = require('fs');
const path = require('path');

// Đọc arguments từ dòng lệnh
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        name: 'MyEnterpriseProject',
        domain: 'Enterprise Cloud System',
        backend: 'Laravel 13, PHP 8.3-FPM',
        frontend: 'Next.js 15, React 19, TypeScript',
        db: 'PostgreSQL 16',
        author: 'Architecture & Engineering Team',
        out: './target-project-docs'
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--name' && args[i + 1]) config.name = args[++i];
        else if (args[i] === '--domain' && args[i + 1]) config.domain = args[++i];
        else if (args[i] === '--backend' && args[i + 1]) config.backend = args[++i];
        else if (args[i] === '--frontend' && args[i + 1]) config.frontend = args[++i];
        else if (args[i] === '--db' && args[i + 1]) config.db = args[++i];
        else if (args[i] === '--author' && args[i + 1]) config.author = args[++i];
        else if (args[i] === '--out' && args[i + 1]) config.out = args[++i];
    }

    return config;
}

const config = parseArgs();
const sourceDir = __dirname;
const targetDir = path.resolve(process.cwd(), config.out);
const currentDate = new Date().toISOString().split('T')[0];

console.log('================================================================');
console.log('🏛️  ENTERPRISE DOCUMENTATION BLUEPRINT GENERATOR');
console.log('================================================================');
console.log(`📌 Dự án:         ${config.name}`);
console.log(`🌐 Miền nghiệp vụ: ${config.domain}`);
console.log(`⚙️  Backend:       ${config.backend}`);
console.log(`💻 Frontend:      ${config.frontend}`);
console.log(`🗄️  Database:      ${config.db}`);
console.log(`📁 Thư mục đích:  ${targetDir}`);
console.log('----------------------------------------------------------------\n');

// Danh sách các từ khóa thay thế
const replacements = [
    { regex: /\{\{PROJECT_NAME\}\}/g, value: config.name },
    { regex: /\{\{DOMAIN_NAME\}\}/g, value: config.domain },
    { regex: /\{\{BACKEND_STACK\}\}/g, value: config.backend },
    { regex: /\{\{FRONTEND_STACK\}\}/g, value: config.frontend },
    { regex: /\{\{DATABASE_STACK\}\}/g, value: config.db },
    { regex: /\{\{AUTHOR\}\}/g, value: config.author },
    { regex: /\{\{DATE\}\}/g, value: currentDate },
    { regex: /\{\{CORE_PROBLEM_STATEMENT\}\}/g, value: `quản lý và tự động hóa quy trình nghiệp vụ trong lĩnh vực ${config.domain}` },
    { regex: /\{\{TABLE_CATEGORY\}\}/g, value: 'categories' },
    { regex: /\{\{TABLE_ITEMS\}\}/g, value: 'items' },
    { regex: /\{\{TABLE_BLUEPRINT\}\}/g, value: 'blueprints' },
    { regex: /\{\{TABLE_PIVOT_ITEMS\}\}/g, value: 'blueprint_items' },
    { regex: /\{\{TABLE_SESSIONS\}\}/g, value: 'sessions' },
    { regex: /\{\{TABLE_ASSIGNMENTS\}\}/g, value: 'session_assignments' },
    { regex: /\{\{TABLE_TRANSACTIONS\}\}/g, value: 'transactions' },
    { regex: /\{\{TABLE_DETAILS\}\}/g, value: 'transaction_details' },
    { regex: /\{\{TABLE_LOGS\}\}/g, value: 'audit_logs' }
];

function transformContent(content) {
    let result = content;
    for (const r of replacements) {
        result = result.replace(r.regex, r.value);
    }
    return result;
}

let fileCount = 0;

function copyAndTransformDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);

        // Bỏ qua chính script scaffold và node_modules/git
        if (entry.name === 'scaffold.js' || entry.name === 'scaffold.ps1' || entry.name === '.git' || entry.name === 'node_modules') {
            continue;
        }

        if (entry.isDirectory()) {
            copyAndTransformDir(srcPath, path.join(dest, entry.name));
        } else if (entry.isFile()) {
            let targetFileName = entry.name;

            // Xóa đuôi .template.md thành .md chuẩn
            if (targetFileName.endsWith('.template.md')) {
                targetFileName = targetFileName.replace('.template.md', '.md');
            }

            // Chuyển AGENTS.md ra thư mục gốc
            let targetFilePath;
            if (entry.name === 'AGENTS.template.md') {
                targetFilePath = path.join(dest, 'AGENTS.md');
            } else if (entry.name === 'PROJECT_OVERVIEW.template.md') {
                targetFilePath = path.join(dest, 'docs', 'PROJECT_OVERVIEW.md');
            } else {
                targetFilePath = path.join(dest, targetFileName);
            }

            // Đảm bảo thư mục cha tồn tại
            const parentDir = path.dirname(targetFilePath);
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
            }

            const rawContent = fs.readFileSync(srcPath, 'utf8');
            const transformed = transformContent(rawContent);

            fs.writeFileSync(targetFilePath, transformed, 'utf8');
            console.log(`  ✅ [CREATED] ${path.relative(targetDir, targetFilePath)}`);
            fileCount++;
        }
    }
}

// Bắt đầu quá trình sao chép & chuyển đổi
try {
    copyAndTransformDir(path.join(sourceDir, 'docs'), path.join(targetDir, 'docs'));
    
    // Copy AGENTS.md và PROJECT_OVERVIEW.md
    const agentsSrc = path.join(sourceDir, 'AGENTS.template.md');
    if (fs.existsSync(agentsSrc)) {
        const agentsContent = transformContent(fs.readFileSync(agentsSrc, 'utf8'));
        fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), agentsContent, 'utf8');
        console.log(`  ✅ [CREATED] AGENTS.md (Engineering Constitution)`);
        fileCount++;
    }

    const overviewSrc = path.join(sourceDir, 'PROJECT_OVERVIEW.template.md');
    if (fs.existsSync(overviewSrc)) {
        const overviewContent = transformContent(fs.readFileSync(overviewSrc, 'utf8'));
        fs.writeFileSync(path.join(targetDir, 'docs', 'PROJECT_OVERVIEW.md'), overviewContent, 'utf8');
        console.log(`  ✅ [CREATED] docs/PROJECT_OVERVIEW.md (Executive Summary)`);
        fileCount++;
    }

    console.log('\n================================================================');
    console.log(`🎉 THÀNH CÔNG! Đã khởi tạo hoàn tất ${fileCount} tệp tài liệu kỹ thuật.`);
    console.log(`📂 Vị trí: ${targetDir}`);
    console.log('👉 Các bước tiếp theo:');
    console.log('   1. Mở file docs/README.md để xem toàn bộ sơ đồ tài liệu.');
    console.log('   2. Đọc HOW_TO_USE_GUIDE.md để nắm quy trình prompt AI cho từng file.');
    console.log('   3. Điền các trường nghiệp vụ cụ thể của bạn vào các tài liệu trong docs/01-requirements/.');
    console.log('================================================================\n');
} catch (err) {
    console.error('❌ LỖI TRONG QUÁ TRÌNH KHỞI TẠO:', err);
    process.exit(1);
}

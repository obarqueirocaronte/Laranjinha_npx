const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/components/manager/CadencesDashboard.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// We want to remove from `{/* 1. ZONA CRÍTICA */}` to the line right before `{/* 3.6. ATIVIDADES POR SDR (DB) */}`
const startLineContent = "                {/* 1. ZONA CRÍTICA */}";
const endLineContent = "                {/* 3.6. ATIVIDADES POR SDR (DB) */};"; // Actually let's just find the index

const startIndex = lines.findIndex(l => l.includes('{/* 1. ZONA CRÍTICA */}'));
const endIndex = lines.findIndex(l => l.includes('{/* 3.6. ATIVIDADES POR SDR (DB) */}'));

if (startIndex !== -1 && endIndex !== -1) {
    // Keep everything before startIndex, and everything from endIndex onwards
    // Wait, there's "                " before start index. Let's make sure we find exact indices.
    const newLines = [
        ...lines.slice(0, startIndex),
        ...lines.slice(endIndex)
    ];
    fs.writeFileSync(filePath, newLines.join('\n'));
    console.log(`Successfully removed lines ${startIndex} to ${endIndex - 1}`);
} else {
    console.log(`Could not find indices: start=${startIndex}, end=${endIndex}`);
}

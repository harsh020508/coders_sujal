// Quick scan to check what functions exist in customer.js
const fs = require('fs');
try {
  const content = fs.readFileSync('C:\\Users\\Utsav\\OneDrive\\Desktop\\hackathon\\coders_sujal\\customer.js', 'utf8');
  const lines = content.split('\n');
  const functionLines = lines.filter(line => line.trim().startsWith('function ') || line.trim().startsWith('show') || line.trim().startsWith('render') || line.trim().startsWith('sidebar-item'));
  console.log('Found function lines:');
  functionLines.forEach(line => console.log(line.trim()));
} catch(e) { console.log('Error:', e.message); }
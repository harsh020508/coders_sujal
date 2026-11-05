const fs = require('fs');
const path = 'C:\\Users\\Utsav\\OneDrive\\Desktop\\hackathon\\coders_sujal';
const files = ['customer.js', 'worker.js', 'storage.js', 'supabaseDataService.js', 'data.js', 'worker_new_features.js', 'css_enhancements.css', 'IMPLEMENTATION_STATUS.md'];

for (const file of files) {
  try {
    const filePath = path + '\\' + file;
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').length;
      console.log(file + ': ' + lines + ' lines, ' + content.length + ' chars');
    } else {
      console.log(file + ': NOT FOUND');
    }
  } catch (e) {
    console.log(file + ': ERROR - ' + e.message);
  }
}

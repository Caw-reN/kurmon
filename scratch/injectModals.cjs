const fs = require('fs');
const path = require('path');

const targetFile = path.join('c:', 'laragon', 'www', 'inkscod', 'kurmon', 'src', 'pages', 'DashboardPage.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Find the modals block
const startMarker = "{/* Mobile Notification Modal */}";
const endMarker = "<PanduanModal isOpen={showPanduan}";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const modalsCode = content.substring(startIndex, endIndex);
  
  // Find where to inject in isTeacher block
  // It should be right before the first PanduanModal
  const firstPanduanIndex = content.indexOf("<PanduanModal isOpen={showPanduan}");
  
  if (firstPanduanIndex !== -1 && firstPanduanIndex < startIndex) {
    const newContent = content.substring(0, firstPanduanIndex) + modalsCode + content.substring(firstPanduanIndex);
    fs.writeFileSync(targetFile, newContent);
    console.log('Modals injected successfully into isTeacher block!');
  } else {
    console.log('Could not find injection point in isTeacher block.');
  }
} else {
  console.log('Could not find modals block.');
}

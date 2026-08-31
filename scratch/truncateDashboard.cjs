const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'src', 'components', 'admin', 'KepsekExecutiveDashboard.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Find the quick links SectionCard closing
const splitMarker = "{/* Quick Links */}";
const splitIdx = content.indexOf(splitMarker);
if (splitIdx === -1) {
  console.error("Marker not found!");
  process.exit(1);
}

// Find the </SectionCard> after Quick Links
const endSectionMarker = "</SectionCard>";
const sectionEndIdx = content.indexOf(endSectionMarker, splitIdx);
if (sectionEndIdx === -1) {
  console.error("Section end not found!");
  process.exit(1);
}

const cleanContent = content.slice(0, sectionEndIdx + endSectionMarker.length) + `
      </div>

    </div>
  );
}
`;

fs.writeFileSync(targetFile, cleanContent, 'utf8');
console.log("Successfully truncated subtabs!");

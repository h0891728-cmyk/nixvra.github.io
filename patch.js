const fs = require('fs');
let content = fs.readFileSync('src/app/super-admin/tenants/[id]/page.tsx', 'utf-8');

// 1. Add internal components imports
content = content.replace(
  `import { formatCompactNumber, formatCompactCurrency } from '@/lib/format'`,
  `import { formatCompactNumber, formatCompactCurrency } from '@/lib/format'\nimport TenantTabs from './_components/TenantTabs'\nimport TenantModulesTester from './_components/TenantModulesTester'`
);

// We want to replace the inside of <div className="os-content"> with <TenantTabs ...
// The sections start with comments:
// {/* Stats Row */} -> overview
// {/* Domains Panel */} -> domains
// {/* Marketing & Communication Hub */} -> marketing
// {/* Financial ERP Panel */} -> erp
// {/* OAuth Integrations Panel */} -> integrations

const splitStart = `<div className="os-content">`;
const parts = content.split(splitStart);

const afterDiv = parts[1]; // This is everything after the os-content div

// We need to split by these comments to get the exact HTML strings
const i1 = afterDiv.indexOf('{/* Domains Panel */}');
const i2 = afterDiv.indexOf('{/* Marketing & Communication Hub */}');
const i3 = afterDiv.indexOf('{/* Financial ERP Panel */}');
const i4 = afterDiv.indexOf('{/* OAuth Integrations Panel */}');

const overviewContent = afterDiv.substring(0, i1).trim();
const domainsContent = afterDiv.substring(i1, i2).trim();
const marketingContent = afterDiv.substring(i2, i3).trim();
const erpContent = afterDiv.substring(i3, i4).trim();

// find the end of the integratiosn content (before the last closing tag `</div>\n    </>\n  )\n}`)
let endDivIndex = afterDiv.lastIndexOf('</div>');
const integrationContent = afterDiv.substring(i4, endDivIndex).trim();
const afterEndDiv = afterDiv.substring(endDivIndex);

const replacement = `
        <TenantTabs 
          overview={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2rem' }}>
              ${overviewContent}
            </div>
          }
          modules={
            <div style={{ paddingBottom: '2rem' }}>
              <TenantModulesTester activeModules={modules} />
            </div>
          }
          domains={
            <div style={{ paddingBottom: '2rem' }}>
              ${domainsContent}
            </div>
          }
          marketing={
            <div style={{ paddingBottom: '2rem' }}>
              ${marketingContent}
            </div>
          }
          erp={
            <div style={{ paddingBottom: '2rem' }}>
              ${erpContent}
            </div>
          }
          integrations={
            <div style={{ paddingBottom: '2rem' }}>
              ${integrationContent}
            </div>
          }
        />
`;

content = parts[0] + splitStart + '\n' + replacement + afterEndDiv;

fs.writeFileSync('src/app/super-admin/tenants/[id]/page.tsx', content);
console.log('patched');

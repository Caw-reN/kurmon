import { useOutletContext } from'react-router-dom';
import { User, Users } from'lucide-react';


const orgChartCss = `
  .org-tree {
    width: 100%;
    display: flex;
    justify-content: center;
  }
  .org-tree ul {
    padding-top: 20px; 
    position: relative;
    display: flex;
    justify-content: center;
    width: 100%;
    margin: 0;
    padding-left: 0;
  }
  .org-tree li {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    min-width: 0;
    text-align: center;
    list-style-type: none;
    position: relative;
    padding: 20px 2px 0 2px;
  }
  /* Connectors */
  .org-tree li::before, .org-tree li::after {
    content:'';
    position: absolute; 
    top: 0; 
    right: 50%;
    border-top: 2px solid #cbd5e1; 
    width: 50%; 
    height: 20px;
    z-index: 0;
  }
  .org-tree li::after {
    right: auto; 
    left: 50%;
    border-left: 2px solid #cbd5e1;
  }
  /* Remove connectors for only child */
  .org-tree li:only-child::after, .org-tree li:only-child::before {
    display: none;
  }
  .org-tree li:only-child { 
    padding-top: 0;
  }
  /* Remove left/right lines from first and last */
  .org-tree li:first-child::before, .org-tree li:last-child::after {
    border: 0 none;
  }
  /* Add vertical line for last child */
  .org-tree li:last-child::before {
    border-right: 2px solid #cbd5e1;
    border-radius: 0 4px 0 0;
  }
  .org-tree li:first-child::after {
    border-radius: 4px 0 0 0;
  }
  /* Vertical line from parent */
  .org-tree ul::before {
    content:'';
    position: absolute; 
    top: 0; 
    left: 50%;
    border-left: 2px solid #cbd5e1;
    width: 0; 
    height: 20px;
    z-index: 0;
    margin-left: -1px;
  }
  /* Root elements should not have top lines */
  .org-tree > ul {
    padding-top: 0;
  }
  .org-tree > ul::before {
    display: none;
  }
`;

const OrgNode = ({ node, primaryColor }) => {
  // Ultra-compact and highly robust sizing that scales down
  const cardWidth ="w-[95%] max-w-[140px]";
  const cardPadding ="p-2 sm:p-3";
  const avatarSize ="w-8 h-8 sm:w-10 sm:h-10 mb-1.5 border-2";
  const nameSize ="text-[9px] sm:text-[11px]";
  const roleSize ="text-[7px] sm:text-[8px] px-1.5 py-0.5 sm:py-1 mb-1";
  const descSize ="text-[8px] sm:text-[9px]";

  return (
    <li>
      {/* Node Card */}
      <div className={`${cardWidth} bg-white border-none rounded-[var(--ui-radius-small)] ${cardPadding} shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative z-10 flex flex-col items-center text-center mx-auto`}>
        <div className={`rounded-[var(--ui-radius-small)] shadow-sm flex items-center justify-center overflow-hidden bg-slate-50 transition-transform duration-300 hover:scale-105 ${avatarSize}`} style={{ borderColor: primaryColor }}>
           {node.photoUrl ? (
             <img src={node.photoUrl} alt={node.name} className="w-full h-full object-cover" />
           ) : (
             <User size={16} className="text-slate-400" />
           )}
        </div>
        <h3 className={`${nameSize} font-bold text-slate-800 mb-1 leading-tight line-clamp-2`}>{node.name ||"Nama Belum Diatur"}</h3>
        <div className={`rounded-[var(--ui-radius-small)] bg-slate-100/80 font-bold shadow-inner text-center tracking-wide leading-tight ${roleSize}`} style={{ color: primaryColor }}>
          {node.position ||"Jabatan"}
        </div>
        {node.description && (
          <p className={`${descSize} text-slate-500 font-medium leading-tight mt-0.5 opacity-90 line-clamp-2`}>{node.description}</p>
        )}
      </div>

      {/* Children */}
      {node.children && node.children.length > 0 && (
        <ul>
          {node.children.map(child => (
             <OrgNode key={child.id} node={child} primaryColor={primaryColor} />
          ))}
        </ul>
      )}
    </li>
  );
};

export default function StrukturOrganisasiPage() {
  const { appSettings } = useOutletContext();
  const strukturOrganisasi = appSettings?.strukturOrganisasi || [];
  const primaryColor = appSettings?.primaryColor ||"#3b82f6";

  // Build the hierarchical tree
  const buildTree = (items) => {
    const map = {};
    const roots = [];
    
    // Initialize map
    items.forEach(item => {
      map[item.id] = { ...item, children: [] };
    });
    
    // Build tree
    items.forEach(item => {
      if (item.parentId && map[item.parentId]) {
        map[item.parentId].children.push(map[item.id]);
      } else {
        roots.push(map[item.id]);
      }
    });
    
    // Sort children by order recursively
    const sortChildren = (node) => {
      node.children.sort((a, b) => (a.order || 0) - (b.order || 0));
      node.children.forEach(sortChildren);
    };
    
    roots.sort((a, b) => (a.order || 0) - (b.order || 0));
    roots.forEach(sortChildren);
    
    return roots;
  };
  
  const orgTree = buildTree(strukturOrganisasi);

  return (
    <div className="w-full flex-1 flex flex-col items-center bg-slate-50/50 relative pt-6 md:pt-10">
      <div className="w-full max-w-full px-5 md:px-8 mx-auto relative z-10 flex flex-col items-center flex-1 pb-24 overflow-x-hidden">
        
        {/* Header Section */}
        <div className="text-center mb-10 max-w-2xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--ui-radius-small)] bg-indigo-50 text-indigo-600 mb-4 border border-indigo-100 shadow-sm">
            <Users size={14} className="animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Profil Sekolah</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight leading-tight mb-4">
            Struktur Organisasi
          </h1>
          <p className="text-slate-500 text-[14px] md:text-[15px] font-medium leading-relaxed">
            Susunan kepengurusan dan manajemen struktural yang berlaku di {appSettings?.appName ||'Sistem Akademik'}.
          </p>
        </div>

        {/* Content Container */}
        <div className="w-full flex flex-col animate-fade-in relative">
          {orgTree.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center justify-center opacity-60">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                <Users size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-slate-800 font-bold text-lg mb-2">Belum Ada Data</h3>
              <p className="text-slate-500 text-sm max-w-md">Data struktur organisasi belum ditambahkan oleh administrator.</p>
            </div>
          ) : (
            <div className="w-full pb-10">
              <style dangerouslySetInnerHTML={{ __html: orgChartCss }} />
              <div className="w-full overflow-x-auto px-2 md:px-5 pt-4 pb-12 custom-scrollbar">
                <div className="org-tree min-w-[600px] sm:min-w-0">
                  <ul>
                    {orgTree.map(root => (
                      <OrgNode key={root.id} node={root} primaryColor={primaryColor} />
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

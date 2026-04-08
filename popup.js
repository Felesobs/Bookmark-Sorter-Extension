// === STATE ===
let selectedSort = 'name';
let selectedDir = 'asc';

// === DOM ===
const folderSelect = document.getElementById('folderSelect');
const sortBtn = document.getElementById('sortBtn');
const status = document.getElementById('status');
const autoSortToggle = document.getElementById('autoSort');

// === LOAD FOLDERS ===
async function loadFolders() {
  const tree = await chrome.bookmarks.getTree();
  folderSelect.innerHTML = '<option value="all">📁 ทั้งหมด (รวมทุกโฟลเดอร์)</option>';

  function traverse(nodes, depth = 0) {
    for (const node of nodes) {
      if (!node.url) {
        if (node.id !== '0') {
          const indent = '　'.repeat(Math.max(0, depth - 1));
          const icon = depth <= 1 ? '📁' : '📂';

          const opt = document.createElement('option');
          opt.value = node.id;
          opt.textContent = `${indent}${icon} ${node.title || '(ไม่มีชื่อ)'}`;
          folderSelect.appendChild(opt);
        }
        if (node.children) traverse(node.children, depth + 1);
      }
    }
  }

  traverse(tree);
}

// === SORT OPTION UI ===
document.querySelectorAll('.sort-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.sort-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    selectedSort = card.dataset.sort;
  });
});

// === DIRECTION ===
document.getElementById('dirAsc').onclick = () => {
  selectedDir = 'asc';
  dirAsc.classList.add('active');
  dirDesc.classList.remove('active');
};

document.getElementById('dirDesc').onclick = () => {
  selectedDir = 'desc';
  dirDesc.classList.add('active');
  dirAsc.classList.remove('active');
};

// === SETTINGS ===
async function loadSettings() {
  const { autoSort, sortBy, sortDir } =
    await chrome.storage.local.get(['autoSort', 'sortBy', 'sortDir']);

  autoSortToggle.checked = !!autoSort;
  if (sortBy) selectedSort = sortBy;
  if (sortDir) selectedDir = sortDir;
}

autoSortToggle.addEventListener('change', () => {
  chrome.storage.local.set({
    autoSort: autoSortToggle.checked,
    sortBy: selectedSort,
    sortDir: selectedDir
  });
});

// === STATUS UI ===
function showStatus(type, msg) {
  status.className = `status ${type}`;
  status.innerHTML = msg;
}

// === MAIN SORT ACTION ===
sortBtn.addEventListener('click', async () => {
  sortBtn.disabled = true;
  showStatus('loading', '⏳ กำลังเรียง...');

  try {
    const res = await chrome.runtime.sendMessage({
      action: 'sort',
      folderId: folderSelect.value,
      sortBy: selectedSort,
      sortDir: selectedDir
    });

    const movedCount = res?.movedCount ?? 0;

    showStatus(
      'success',
      movedCount === 0
        ? '✅ ไม่มีการเปลี่ยนแปลง'
        : `✅ เรียงแล้ว (${movedCount} รายการ)`
    );

  } catch (err) {
    showStatus('error', '❌ ' + err.message);
  }

  sortBtn.disabled = false;
});

// === INIT ===
loadFolders();
loadSettings();
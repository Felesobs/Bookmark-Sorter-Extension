// =========================
// 🔧 SORT CORE
// =========================
function getSortKey(node, sortBy) {
  if (sortBy === 'date') return node.dateAdded || 0;
  return (node.title || '').toLowerCase();
}

async function sortFolderOptimized(folderId, sortBy, sortDir) {
  const nodes = await chrome.bookmarks.getChildren(folderId);
  const bookmarks = nodes.filter(n => n.url);

  const sorted = [...bookmarks].sort((a, b) => {
    let A = getSortKey(a, sortBy);
    let B = getSortKey(b, sortBy);

    if (A < B) return sortDir === 'asc' ? -1 : 1;
    if (A > B) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  let moved = 0;

  for (let i = 0; i < sorted.length; i++) {
    if (bookmarks[i].id !== sorted[i].id) {
      await chrome.bookmarks.move(sorted[i].id, {
        parentId: folderId,
        index: i
      });
      moved++;
    }
  }

  return moved;
}

async function sortAllFoldersSafe(sortBy, sortDir) {
  const tree = await chrome.bookmarks.getTree();
  let movedTotal = 0;

  async function traverse(nodes) {
    for (const node of nodes) {
      if (!node.url && node.children) {
        movedTotal += await sortFolderOptimized(node.id, sortBy, sortDir);
        await traverse(node.children);
      }
    }
  }

  await traverse(tree);
  return movedTotal;
}

// =========================
// 📩 MESSAGE FROM POPUP
// =========================
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'sort') {
    (async () => {
      try {
        let movedCount = 0;

        if (msg.folderId === 'all') {
          movedCount = await sortAllFoldersSafe(msg.sortBy, msg.sortDir);
        } else {
          movedCount = await sortFolderOptimized(msg.folderId, msg.sortBy, msg.sortDir);
        }

        sendResponse({ movedCount });

      } catch (err) {
        sendResponse({ error: err.message });
      }
    })();

    return true;
  }
});

// =========================
// ⚡ AUTO SORT (REALTIME)
// =========================
let debounceMap = {};

function debounceSort(folderId, sortBy, sortDir) {
  clearTimeout(debounceMap[folderId]);

  debounceMap[folderId] = setTimeout(async () => {
    try {
      await sortFolderOptimized(folderId, sortBy, sortDir);
    } catch (e) {
      console.error(e);
    }
  }, 500);
}

chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  const { autoSort, sortBy = 'name', sortDir = 'asc' } =
    await chrome.storage.local.get(['autoSort', 'sortBy', 'sortDir']);

  if (!autoSort || !bookmark.parentId) return;

  debounceSort(bookmark.parentId, sortBy, sortDir);
});
/**
 * admin-menu.js
 * Admin Menu Management page logic.
 *
 * API calls wired up:
 *   GET    /api/menu            → load and render all menu items
 *   POST   /api/menu            → add new item (from the Add Item form)
 *   PATCH  /api/menu/:id        → save inline edits (edit row)
 *   DELETE /api/menu/:id        → delete a menu item
 *   PATCH  /api/menu/:id/availability → toggle available/unavailable
 */

// ─── State ────────────────────────────────────────────────────
let menuItems = [];           // cached menu data from last API fetch
let editingId = null;         // which row is currently being edited (null = none)

// ─── DOM refs ──────────────────────────────────────────────────
const menuTbody   = document.getElementById('menu-tbody');
const itemCount   = document.getElementById('item-count');

// Add form fields
const frmName     = document.getElementById('new-name');
const frmCategory = document.getElementById('new-category');
const frmPrice    = document.getElementById('new-price');
const frmDesc     = document.getElementById('new-description');
const frmAvail    = document.getElementById('new-available');
const frmImage    = document.getElementById('new-image');
const addForm     = document.getElementById('add-item-form');

// Confirm delete modal
const deleteModal   = document.getElementById('delete-modal');
const deleteItemName = document.getElementById('delete-item-name');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
let pendingDeleteId = null;

// ─── Load Menu ────────────────────────────────────────────────

/**
 * Fetch all menu items from GET /api/menu and render the table.
 * Also updates the item count badge in the section header.
 */
async function loadMenu() {
  setTableLoading();
  try {
    menuItems = await getMenu();
    renderMenuTable(menuItems);

    if (itemCount) itemCount.textContent = `${menuItems.length} items`;
  } catch (err) {
    console.error('[Menu] Load error:', err);
      // Menu Load error
    showToast(err.message, 'error');
    setTableError(err.message);
  }
}

// ─── Render Table ─────────────────────────────────────────────

/**
 * Render the full menu items table from a data array.
 * Each row shows the item's fields and action buttons.
 * @param {Array} items
 */
function renderMenuTable(items) {
  if (!menuTbody) return;

  if (!items.length) {
    menuTbody.innerHTML = `
      <tr>
        <td colspan="7" class="table-state">
          <div class="state-icon">🍽️</div>
          No menu items yet. Add one above.
        </td>
      </tr>`;
    return;
  }

  menuTbody.innerHTML = items.map(item => buildMenuRow(item)).join('');
  attachRowListeners();
}

/**
 * Build a static (non-editing) HTML row for a menu item.
 * @param {Object} item
 * @returns {string}
 */
function buildMenuRow(item) {
  const avail = item.available !== false; // default to available if flag missing
  return `
    <tr data-id="${item.id}">
      <td class="td-mono">${escapeHtml(String(item.id))}</td>
      <td><strong>${escapeHtml(item.name)}</strong></td>
      <td>${escapeHtml(item.category || '—')}</td>
      <td class="td-mono">${fmt$(item.price)}</td>
      <td class="td-muted" style="max-width:200px;white-space:normal;font-size:0.8rem">
        ${escapeHtml(item.description || item.desc || '—')}
      </td>
      <td style="text-align:center">
        ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;" />` : '<span style="color:#aaa">—</span>'}
      </td>
      <td>
        <span class="badge badge-${avail ? 'available' : 'unavailable'}">
          ${avail ? 'Available' : 'Unavailable'}
        </span>
      </td>
      <td class="td-actions">
        <div class="action-group">
          <button class="btn btn-outline btn-sm btn-edit" data-id="${item.id}" title="Edit item">
            ✎ Edit
          </button>
          <button class="btn btn-sm ${avail ? 'btn-neutral' : 'btn-success'} btn-toggle"
            data-id="${item.id}" data-available="${avail}" title="Toggle availability">
            ${avail ? 'Disable' : 'Enable'}
          </button>
          <button class="btn btn-danger btn-sm btn-delete" data-id="${item.id}"
            data-name="${escapeHtml(item.name)}" title="Delete item">
            Delete
          </button>
        </div>
      </td>
    </tr>`;
}

/**
 * Build an inline-editing row for a menu item.
 * Text cells become input fields; the Save/Cancel buttons appear.
 * @param {Object} item
 * @returns {string}
 */
function buildEditRow(item) {
  const avail = item.available !== false;
  return `
    <tr data-id="${item.id}" class="row-editing">
      <td class="td-mono">${escapeHtml(String(item.id))}</td>
      <td><input class="edit-name" value="${escapeHtml(item.name)}" placeholder="Name" /></td>
      <td><input class="edit-category" value="${escapeHtml(item.category || '')}" placeholder="Category" /></td>
      <td><input class="edit-price" type="number" step="0.01" min="0"
            value="${parseFloat(item.price || 0).toFixed(2)}" placeholder="Price" style="width:80px"/></td>
      <td><input class="edit-desc" value="${escapeHtml(item.description || item.desc || '')}"
            placeholder="Description" style="width:160px"/></td>
      <td>
        <select class="edit-avail">
          <option value="true"  ${avail  ? 'selected' : ''}>Available</option>
          <option value="false" ${!avail ? 'selected' : ''}>Unavailable</option>
        </select>
      </td>
      <td class="td-actions">
        <div class="action-group">
          <button class="btn btn-success btn-sm btn-save-edit" data-id="${item.id}">
            ✓ Save
          </button>
          <button class="btn btn-outline btn-sm btn-cancel-edit" data-id="${item.id}">
            Cancel
          </button>
        </div>
      </td>
    </tr>`;
}

// ─── Row Event Listeners ──────────────────────────────────────

/**
 * Attach click handlers to all action buttons in the table.
 * Called every time the table is re-rendered.
 *
 * Button classes → actions:
 *   .btn-edit        → switchToEditRow(id)
 *   .btn-toggle      → handleToggleAvailability(id, currentAvailable)
 *   .btn-delete      → openDeleteModal(id, name)
 *   .btn-save-edit   → handleSaveEdit(id)
 *   .btn-cancel-edit → cancelEdit(id)
 */
function attachRowListeners() {
  if (!menuTbody) return;

  menuTbody.addEventListener('click', async e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const id = btn.dataset.id;

    if (btn.classList.contains('btn-edit')) {
      switchToEditRow(id);

    } else if (btn.classList.contains('btn-toggle')) {
      // Current availability is stored in data-available attribute
      const isCurrentlyAvailable = btn.dataset.available === 'true';
      await handleToggleAvailability(id, isCurrentlyAvailable);

    } else if (btn.classList.contains('btn-delete')) {
      openDeleteModal(id, btn.dataset.name);

    } else if (btn.classList.contains('btn-save-edit')) {
      await handleSaveEdit(id);

    } else if (btn.classList.contains('btn-cancel-edit')) {
      cancelEdit(id);
    }
  }, { once: false }); // Replaced on each render — we use one delegated listener
}

// ─── EDIT: inline row editing ─────────────────────────────────

/**
 * Replace the static row with an editable row.
 * Only one row can be editing at a time; saves unsaved edits on switch.
 * @param {string|number} id
 */
function switchToEditRow(id) {
  // If another row is being edited, cancel it first
  if (editingId && editingId !== id) cancelEdit(editingId);

  const item = menuItems.find(i => String(i.id) === String(id));
  if (!item) return;

  const row = menuTbody.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  editingId = id;
  row.outerHTML = buildEditRow(item);
  // Re-attach listeners after DOM change
  // (we use event delegation so this is automatic)

  // Focus first input
  const first = menuTbody.querySelector(`tr[data-id="${id}"] input`);
  if (first) first.focus();
}

/**
 * Read values from the edit row inputs and PATCH /api/menu/:id.
 * On success: replace edit row with refreshed static row.
 * @param {string|number} id
 */
async function handleSaveEdit(id) {
  const row = menuTbody.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  // Read current input values
  const name     = row.querySelector('.edit-name')?.value.trim();
  const category = row.querySelector('.edit-category')?.value.trim();
  const price    = parseFloat(row.querySelector('.edit-price')?.value);
  const desc     = row.querySelector('.edit-desc')?.value.trim();
  const available= row.querySelector('.edit-avail')?.value === 'true';

  if (!name) { showToast('Name is required.', 'warning'); return; }
  if (isNaN(price) || price < 0) { showToast('Enter a valid price.', 'warning'); return; }
  const saveBtn = row.querySelector('.btn-save-edit');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }
  let updated = null;
  try {
    updated = await updateMenuItem(id, { name, category, price, description: desc, available });
  } catch (err) {
    showToast(err.message, 'error');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '✓ Save'; }
    return;
  }
  const idx = menuItems.findIndex(i => String(i.id) === String(id));
  if (idx >= 0) menuItems[idx] = { ...menuItems[idx], ...updated, name, category, price, description: desc, available };
  editingId = null;
  renderMenuTable(menuItems);
  showToast(`"${name}" updated.`, 'success');
}

/**
 * Cancel edit: replace edit row back with the original static row.
 * @param {string|number} id
 */
function cancelEdit(id) {
  const item = menuItems.find(i => String(i.id) === String(id));
  if (!item) return;

  const row = menuTbody.querySelector(`tr[data-id="${id}"]`);
  if (row) row.outerHTML = buildMenuRow(item);

  editingId = null;
}

// ─── TOGGLE Availability ──────────────────────────────────────

/**
 * PATCH /api/menu/:id/availability — flip available flag.
 * Updates the row in place without a full table re-render.
 * @param {string|number} id
 * @param {boolean} currentlyAvailable
 */
async function handleToggleAvailability(id, currentlyAvailable) {
  const newAvailable = !currentlyAvailable;
  const item = menuItems.find(i => String(i.id) === String(id));
  if (!item) return;
  item.available = newAvailable;
  const row = menuTbody.querySelector(`tr[data-id="${id}"]`);
  if (row) row.outerHTML = buildMenuRow(item);
  try {
    await toggleMenuItemAvailability(id, newAvailable);
    showToast(`"${item.name}" ${newAvailable ? 'enabled' : 'disabled'}.`, 'success');
  } catch (err) {
    item.available = currentlyAvailable;
    const updatedRow = menuTbody.querySelector(`tr[data-id="${id}"]`);
    if (updatedRow) updatedRow.outerHTML = buildMenuRow(item);
    showToast(err.message, 'error');
  }
}

// ─── DELETE ───────────────────────────────────────────────────

/**
 * Open the confirm-delete modal.
 * @param {string|number} id
 * @param {string} name
 */
function openDeleteModal(id, name) {
  pendingDeleteId = id;
  if (deleteItemName) deleteItemName.textContent = name;
  if (deleteModal) deleteModal.classList.add('open');
}

/** Close delete modal without doing anything. */
function closeDeleteModal() {
  pendingDeleteId = null;
  if (deleteModal) deleteModal.classList.remove('open');
}

/**
 * Confirm delete: call DELETE /api/menu/:id and remove row from DOM.
 */
async function handleConfirmDelete() {
  if (!pendingDeleteId) return;

  const id   = pendingDeleteId;
  const item = menuItems.find(i => String(i.id) === String(id));

  if (confirmDeleteBtn) { confirmDeleteBtn.disabled = true; confirmDeleteBtn.textContent = 'Deleting…'; }

  try {
    // DELETE /api/menu/:id
    await deleteMenuItem(id);

    // Remove from local cache and re-render
    menuItems = menuItems.filter(i => String(i.id) !== String(id));
    closeDeleteModal();
    renderMenuTable(menuItems);
    if (itemCount) itemCount.textContent = `${menuItems.length} items`;
    showToast(`"${item?.name || 'Item'}" deleted.`, 'success');

  } catch (err) {
    // Menu Delete error
    showToast(err.message, 'error');
  } finally {
    if (confirmDeleteBtn) { confirmDeleteBtn.disabled = false; confirmDeleteBtn.textContent = 'Yes, Delete'; }
  }
}

// ─── ADD Item Form ─────────────────────────────────────────────

/**
 * Handle Add Item form submission.
 * Reads form fields, validates, and calls POST /api/menu.
 * On success: appends to local cache and re-renders table.
 * @param {Event} e
 */
async function handleAddItem(e) {
  e.preventDefault();

  const name     = frmName?.value.trim();
  const category = frmCategory?.value.trim();
  const price    = parseFloat(frmPrice?.value);
  const desc     = frmDesc?.value.trim();
  const available= frmAvail?.value !== 'false';
  const image    = frmImage?.files[0];

  if (!name) { showToast('Item name is required.', 'warning'); frmName?.focus(); return; }
  if (isNaN(price) || price < 0) { showToast('Enter a valid price.', 'warning'); frmPrice?.focus(); return; }
  const submitBtn = addForm?.querySelector('[type="submit"]');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Adding…'; }
  let newItem = null;
  try {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('price', price);
    formData.append('description', desc);
    formData.append('available', available);
    if (image) formData.append('image', image);
    const res = await fetch('http://localhost:3000/api/menu', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to add menu item');
    newItem = await res.json();
  } catch (err) {
    showToast(err.message, 'error');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '+ Add Item'; }
    return;
  }
  menuItems.push(newItem);
  renderMenuTable(menuItems);
  if (itemCount) itemCount.textContent = `${menuItems.length} items`;
  addForm?.reset();
  showToast(`"${name}" added to menu.`, 'success');
  if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '+ Add Item'; }
}

// ─── Table State Helpers ──────────────────────────────────────

function setTableLoading() {
  if (!menuTbody) return;
  menuTbody.innerHTML = `
    <tr class="loading-row">
      <td colspan="7">
        <span class="spinner-inline"></span> Loading menu items…
      </td>
    </tr>`;
}

function setTableError(msg) {
  if (!menuTbody) return;
  menuTbody.innerHTML = `
    <tr>
      <td colspan="7" class="text-danger text-center" style="padding:24px">
        ✕ ${escapeHtml(msg)}
      </td>
    </tr>`;
}

// ─── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadMenu();

  // Add item form
  if (addForm) addForm.addEventListener('submit', handleAddItem);

  // Delete modal confirm / cancel
  if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);

  // Clicking backdrop closes modal
  if (deleteModal) {
    deleteModal.addEventListener('click', e => {
      if (e.target === deleteModal) closeDeleteModal();
    });
  }

  // Search/filter
  const searchInput = document.getElementById('menu-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      const filtered = menuItems.filter(i =>
        i.name?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q)
      );
      renderMenuTable(filtered);
    });
  }
});

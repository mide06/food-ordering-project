const { MenuItem } = require('../models');

// Create a new menu item
exports.createMenuItem = async (req, res) => {
  try {
    const { name, description, price, category } = req.body;
    let imagePath = null;
    if (req.file) {
      imagePath = '/uploads/' + req.file.filename;
    }
    const menu = await MenuItem.create({ name, description, price, category, image: imagePath });
    res.status(201).json(menu);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all menu items
exports.getAllMenuItems = async (req, res) => {
  try {
    const items = await MenuItem.findAll();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update menu item
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const menu = await MenuItem.findByPk(id);
    if (!menu) return res.status(404).json({ message: 'Menu item not found' });

    const { name, description, price, category, image, available } = req.body;
    await menu.update({ name, description, price, category, image, available });
    res.json(menu);
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete menu item
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const menu = await MenuItem.findByPk(id);
    if (!menu) return res.status(404).json({ message: 'Menu item not found' });

    await menu.destroy();
    res.status(204).json();
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Toggle availability
exports.toggleAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { available } = req.body;
    const menu = await MenuItem.findByPk(id);
    if (!menu) return res.status(404).json({ message: 'Menu item not found' });

    menu.available = available !== undefined ? available : !menu.available;
    await menu.save();
    res.json({ message: `Menu item ${menu.name} availability set to ${menu.available}`, menu });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ message: error.message });
  }
};
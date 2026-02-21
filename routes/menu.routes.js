const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  createMenuItem,
  getAllMenuItems,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability
} = require('../controllers/menu.controller');

router.post('/', upload.single('image'), createMenuItem);
router.get('/', getAllMenuItems);
router.patch('/:id', updateMenuItem);
router.delete('/:id', deleteMenuItem);
router.patch('/:id/availability', toggleAvailability);

module.exports = router;
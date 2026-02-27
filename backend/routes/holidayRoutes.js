import express from 'express';
import {
    getHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday
} from '../controllers/holidayController.js';
import { auth } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';

const router = express.Router();

// Publicly readable for all authenticated users
router.get('/', auth, getHolidays);

// Mutable only by executives
router.post('/', auth, rbac(['executive']), createHoliday);
router.put('/:id', auth, rbac(['executive']), updateHoliday);
router.delete('/:id', auth, rbac(['executive']), deleteHoliday);

export default router;

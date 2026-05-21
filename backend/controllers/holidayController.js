import Holiday from '../models/Holiday.js';

/**
 * Get all holidays for a specific year
 * @route GET /api/holidays
 * @access Private
 */
export const getHolidays = async (req, res) => {
    try {
        const { year } = req.query;

        // Default to current year if not provided
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        const holidays = await Holiday.find({ year: targetYear }).sort({ date: 1 });
        res.json(holidays);
    } catch (error) {
        console.error('Error fetching holidays:', error);
        res.status(500).json({ error: 'Failed to fetch holidays' });
    }
};

/**
 * Create a new holiday
 * @route POST /api/holidays
 * @access Private (Executive only)
 */
export const createHoliday = async (req, res) => {
    try {
        const { name, date, isFlexi } = req.body;

        if (!name || !date) {
            return res.status(400).json({ error: 'Name and date are required' });
        }

        const parsedDate = new Date(date);
        const year = parsedDate.getFullYear();

        // Check for duplicate date in the same year
        const existingHoliday = await Holiday.findOne({
            date: {
                $gte: new Date(year, parsedDate.getMonth(), parsedDate.getDate()),
                $lt: new Date(year, parsedDate.getMonth(), parsedDate.getDate() + 1)
            }
        });

        if (existingHoliday) {
            return res.status(400).json({ error: 'A holiday already exists on this date' });
        }

        const holiday = new Holiday({
            name,
            date: parsedDate,
            year,
            isFlexi: isFlexi || false,
            createdBy: req.user._id,
        });

        await holiday.save();
        res.status(201).json(holiday);
    } catch (error) {
        console.error('Error creating holiday:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'A holiday already exists on this date' });
        }
        res.status(500).json({ error: 'Failed to create holiday' });
    }
};

/**
 * Update a holiday
 * @route PUT /api/holidays/:id
 * @access Private (Executive only)
 */
export const updateHoliday = async (req, res) => {
    try {
        const { name, date, isFlexi } = req.body;
        const holidayId = req.params.id;

        const holiday = await Holiday.findById(holidayId);

        if (!holiday) {
            return res.status(404).json({ error: 'Holiday not found' });
        }

        // Fix: If holiday was created without createdBy (e.g. initial setup),
        // assign it to the user who is now updating it.
        if (!holiday.createdBy) {
            holiday.createdBy = req.user._id;
        }

        if (name) holiday.name = name;
        if (isFlexi !== undefined) holiday.isFlexi = isFlexi;

        if (date) {
            const parsedDate = new Date(date);
            const year = parsedDate.getFullYear();

            // Check for duplicate date if the date is being changed
            const isDateChanged = new Date(holiday.date).getTime() !== parsedDate.getTime();

            if (isDateChanged) {
                const existingHoliday = await Holiday.findOne({
                    _id: { $ne: holidayId },
                    date: {
                        $gte: new Date(year, parsedDate.getMonth(), parsedDate.getDate()),
                        $lt: new Date(year, parsedDate.getMonth(), parsedDate.getDate() + 1)
                    }
                });

                if (existingHoliday) {
                    return res.status(400).json({ error: 'A holiday already exists on this date' });
                }

                holiday.date = parsedDate;
                holiday.year = year;
            }
        }

        await holiday.save();
        res.json(holiday);
    } catch (error) {
        console.error('Error updating holiday:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'A holiday already exists on this date' });
        }
        res.status(500).json({ error: 'Failed to update holiday' });
    }
};

/**
 * Delete a holiday
 * @route DELETE /api/holidays/:id
 * @access Private (Executive only)
 */
export const deleteHoliday = async (req, res) => {
    try {
        const holidayId = req.params.id;
        const holiday = await Holiday.findByIdAndDelete(holidayId);

        if (!holiday) {
            return res.status(404).json({ error: 'Holiday not found' });
        }

        res.json({ message: 'Holiday deleted successfully' });
    } catch (error) {
        console.error('Error deleting holiday:', error);
        res.status(500).json({ error: 'Failed to delete holiday' });
    }
};

import RecycleBin from '../models/recycleBin.js';

export const getRecycleBins = async (req, res) => {
    try {
        const recycleBins = await RecycleBin.findOne();
        res.status(200).json(recycleBins);
    } catch(error) {
        res.status(500).json({ message: error.message });
    }
}
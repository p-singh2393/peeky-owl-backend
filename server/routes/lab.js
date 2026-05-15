import { Router } from 'express';
import { LabAccess } from '../models/LabAccess.js';

const router = Router();

router.post('/access', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    await LabAccess.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true });
    res.json({ success: true, data: { message: 'Access request received. You will hear from us.' } });
  } catch (error) {
    next(error);
  }
});

export default router;

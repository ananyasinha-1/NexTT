const express = require('express');
const router  = express.Router();
const LostItem = require('../database/models/LostItem');
const Claim    = require('../database/models/Claim');

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_ITEMS = [
  {
    _id: 'li1', title: 'Lost Wallet', description: 'Black leather wallet with student ID inside.',
    imageUrl: '', location: 'Library – 2nd Floor', type: 'lost', status: 'active',
    userId: 'demo', userDisplay: 'Rahul S.', date: '2026-04-10', createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    _id: 'li2', title: 'Found Keys', description: 'A bunch of keys with a blue keychain found near the cafeteria entrance.',
    imageUrl: '', location: 'Cafeteria', type: 'found', status: 'active',
    userId: 'demo2', userDisplay: 'Priya K.', date: '2026-04-10', createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    _id: 'li3', title: 'Lost Earphones', description: 'White wired earphones, left in the computer lab.',
    imageUrl: '', location: 'Computer Lab', type: 'lost', status: 'active',
    userId: 'demo3', userDisplay: 'Amit R.', date: '2026-04-09', createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

let MOCK_CLAIMS = [];

// ── GET /api/nexlocate/items  – all items (with optional filters)
router.get('/items', async (req, res) => {
  const { type, location, search } = req.query;

  const filterMock = () => {
    let filtered = MOCK_ITEMS;
    if (type && type !== 'all')
      filtered = filtered.filter(i => i.type === type);
    if (location)
      filtered = filtered.filter(i => i.location.toLowerCase().includes(location.toLowerCase()));
    if (search)
      filtered = filtered.filter(i => i.title.toLowerCase().includes(search.toLowerCase()));
    return filtered;
  };

  try {
    let query = {};
    if (type && type !== 'all') query.type = type;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (search)   query.title    = { $regex: search,   $options: 'i' };
    const items = await LostItem.find(query).sort({ createdAt: -1 });
    if (items.length === 0) return res.json(filterMock());
    res.json(items);
  } catch {
    res.json(filterMock());
  }
});

// ── GET /api/nexlocate/items/:userId/mine  – user's own reports
router.get('/items/:userId/mine', async (req, res) => {
  try {
    const items = await LostItem.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(items);
  } catch {
    res.json(MOCK_ITEMS.filter(i => i.userId === req.params.userId));
  }
});

// ── POST /api/nexlocate/items  – report a new item
router.post('/items', async (req, res) => {
  const { title, description, imageUrl, location, type, userId, userDisplay, date } = req.body;
  if (!title || !description || !imageUrl || !location) {
    return res.status(400).json({ message: 'Title, description, image, and location are required.' });
  }
  try {
    const item = new LostItem({ title, description, imageUrl, location, type, userId, userDisplay, date });
    await item.save();
    res.status(201).json({ message: 'Item reported', item });
  } catch {
    // Mock success
    const mockItem = { _id: `li-${Date.now()}`, title, description, imageUrl, location, type, userId, userDisplay, date, status: 'active', createdAt: new Date().toISOString() };
    MOCK_ITEMS.unshift(mockItem);
    res.status(201).json({ message: 'Item reported (mock)', item: mockItem });
  }
});

// ── DELETE /api/nexlocate/items/:id  – remove own report
router.delete('/items/:id', async (req, res) => {
  const { userId } = req.body;
  try {
    const item = await LostItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (item.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden — you can only delete your own reports' });
    }

    await LostItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item removed' });
  } catch {
    // Mock fallback — check ownership against mock data
    const mockItem = MOCK_ITEMS.find(i => i._id === req.params.id);
    if (mockItem && mockItem.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden — you can only delete your own reports' });
    }
    res.json({ message: 'Item removed (mock)' });
  }
});

// ── GET /api/nexlocate/claims/item/:itemId  – get all claims on an item
router.get('/claims/item/:itemId', async (req, res) => {
  try {
    const claims = await Claim.find({ itemId: req.params.itemId }).sort({ createdAt: -1 });
    res.json(claims);
  } catch {
    res.json(MOCK_CLAIMS.filter(c => c.itemId === req.params.itemId));
  }
});

// ── GET /api/nexlocate/claims/user/:userId  – claims submitted by a user
router.get('/claims/user/:userId', async (req, res) => {
  try {
    const claims = await Claim.find({ claimantId: req.params.userId }).sort({ createdAt: -1 });
    res.json(claims);
  } catch {
    res.json(MOCK_CLAIMS.filter(c => c.claimantId === req.params.userId));
  }
});

// ── POST /api/nexlocate/claims  – submit a claim
router.post('/claims', async (req, res) => {
  const { itemId, claimantId, claimantName, proof, proofImageUrl } = req.body;
  if (!itemId || !proof) {
    return res.status(400).json({ message: 'Item ID and proof are required.' });
  }
  try {
    // Prevent duplicate pending claims from same user on same item
    const existing = await Claim.findOne({ itemId, claimantId, status: 'pending' });
    if (existing) return res.status(409).json({ message: 'You already have a pending claim on this item.' });

    const claim = new Claim({ itemId, claimantId, claimantName, proof, proofImageUrl });
    await claim.save();
    res.status(201).json({ message: 'Claim submitted', claim });
  } catch {
    const mockClaim = { _id: `cl-${Date.now()}`, itemId, claimantId, claimantName, proof, proofImageUrl, status: 'pending', createdAt: new Date().toISOString() };
    MOCK_CLAIMS.push(mockClaim);
    res.status(201).json({ message: 'Claim submitted (mock)', claim: mockClaim });
  }
});

// ── PATCH /api/nexlocate/claims/:id/status  – owner accepts/rejects a claim
router.patch('/claims/:id/status', async (req, res) => {
  const { status, message } = req.body;   // status: 'approved' | 'rejected'
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be approved or rejected.' });
  }
  try {
    const claim = await Claim.findById(req.params.id);
    if (!claim) throw new Error('not found');

    claim.status  = status;
    claim.message = message || '';
    await claim.save();

    // If approved, mark item as claimed & reject all other pending claims
    if (status === 'approved') {
      await LostItem.findByIdAndUpdate(claim.itemId, { status: 'claimed' });
      await Claim.updateMany(
        { itemId: claim.itemId, _id: { $ne: claim._id }, status: 'pending' },
        { status: 'rejected', message: 'Another claim was approved.' }
      );
    }
    res.json({ message: `Claim ${status}`, claim });
  } catch {
    // Mock
    const mc = MOCK_CLAIMS.find(c => c._id === req.params.id);
    if (mc) mc.status = status;
    res.json({ message: `Claim ${status} (mock)` });
  }
});

module.exports = router;

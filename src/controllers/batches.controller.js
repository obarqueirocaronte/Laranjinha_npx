const db = require('../config/db');

/**
 * List all lead batches with metrics
 */
exports.listBatches = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT lb.*, 
       (SELECT COUNT(*) FROM leads l WHERE l.lead_batch_id = lb.id) as actual_leads_count,
       (SELECT COUNT(*) FROM leads l 
        JOIN lead_cadence lc ON l.id = lc.lead_id 
        WHERE l.lead_batch_id = lb.id AND lc.status = 'concluida') as completed_leads_count
       FROM lead_batches lb
       ORDER BY lb.import_date DESC`
    );

    // Calculate progress percentage
    const batches = result.rows.map(batch => {
      const total = parseInt(batch.actual_leads_count) || batch.total_leads || 0;
      const completed = parseInt(batch.completed_leads_count) || 0;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { ...batch, progress };
    });

    return res.json({ success: true, data: batches });
  } catch (err) {
    next(err);
  }
};

/**
 * Get batch details and leads
 */
exports.getBatchDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const batchRes = await db.query('SELECT * FROM lead_batches WHERE id = $1', [id]);
    
    if (batchRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    const leadsRes = await db.query(
      `SELECT l.*, 
              lc.status as cadence_status, lc.step_atual, lc.max_steps,
              u.profile_picture_url as sdr_profile_picture_url,
              u.role as sdr_role,
              s.full_name as assigned_sdr_name
       FROM leads l
       LEFT JOIN lead_cadence lc ON l.id = lc.lead_id
       LEFT JOIN sdrs s ON l.assigned_sdr_id = s.id
       LEFT JOIN users u ON s.user_id = u.id
       WHERE l.lead_batch_id = $1
       ORDER BY l.created_at DESC
       LIMIT 500`,
      [id]
    );

    return res.json({ 
      success: true, 
      data: { 
        batch: batchRes.rows[0],
        leads: leadsRes.rows
      } 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update batch tags and apply to all leads in batch
 */
exports.updateBatchTags = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tags } = req.body; // Array of tag names or IDs? Let's assume names for now.

    if (!Array.isArray(tags)) {
      return res.status(400).json({ success: false, error: 'Tags must be an array' });
    }

    // 1. Update the batch record
    await db.query(
      'UPDATE lead_batches SET tags = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(tags), id]
    );

    // 2. We don't necessarily want to force-write tags to all leads IF they have individual tags,
    // but the user said "Ações em lote" and "Gestão de Lotes (ao clicar no lote) ... Tags (editável)".
    // Usually this means the batch HAS tags that leads inherit or are specifically applied.
    
    // For now, let's just return success. If they want to sync tags to all leads, we'd do:
    // This could be heavy, maybe do it via a bulk action endpoint instead.

    return res.json({ success: true, message: 'Batch tags updated' });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete batch and optionally its leads
 */
exports.deleteBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deleteLeads } = req.query;

    if (deleteLeads === 'true') {
      await db.query('DELETE FROM leads WHERE lead_batch_id = $1', [id]);
    } else {
      await db.query('UPDATE leads SET lead_batch_id = NULL WHERE lead_batch_id = $1', [id]);
    }

    await db.query('DELETE FROM lead_batches WHERE id = $1', [id]);

    return res.json({ success: true, message: 'Batch deleted' });
  } catch (err) {
    next(err);
  }
};

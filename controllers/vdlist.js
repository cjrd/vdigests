const { VDigest } = require('../models/VDigest');

/**
 * GET /contact
 * Contact form page.
 */
exports.getVDList = async function (req, res) {
  const vds = await VDigest.findAll({
    where: { pubdisplay: true },
    attributes: ['id', 'puburl', 'title'],
    order: [['createdAt', 'DESC']],
    limit: 20,
  });

  res.render('vdlist', {
    title: 'Video Digests',
    vds,
  });
};

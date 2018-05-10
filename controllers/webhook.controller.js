const mongoose = require('mongoose');
const Pullrequest = mongoose.model('pullrequests');
const Repository = mongoose.model('repositories');
const Raven = require('raven');

require('../services/raven');

module.exports.newEvent = async (req, res) => {
  const { id, html_url, url, state, title, body, comments, user, created_at, updated_at, closed_at, merged_at } = req.body.pull_request;
  const existPullrequest = await Pullrequest.findOne({ githubId: id });
  const values = {
    githubId: id,
    action: req.body.action,
    number: req.body.number,
    webUrl: html_url,
    apiUrl: url,
    state: state,
    title: title,
    comment: body,
    comments: comments,
    user: {
      githubId: user.id,
      loginName: user.login,
      picture: user.avatar_url,
      apiUrl: user.url,
      webUrl: user.html_url,
    },
    created_at: created_at,
    updated_at: updated_at,
    closed_at: closed_at,
    merged_at: merged_at,
  };

  if (!existPullrequest) {
    try {
      const repo = await Repository.findOne({ githubId: req.body.repository.id });
      values.repository = repo;

      const pullrequest = new Pullrequest(values);
      await pullrequest.save();

      await repo.update({ $push: { _pullRequests: { pullRequest: pullrequest._id } } });

      res.status(201).send({ message: 'Pull request created.' });
    } catch (e) {
      Raven.captureException(e);
      res.status(400).send(e);
    }
  } else {
    try {
      await existPullrequest.update(values);
      res.status(201).send({ message: 'Pull request updated.' });
    } catch (e) {
      Raven.captureException(e);
      res.status(400).send(e);
    };
  }
};

module.exports.enable = async (req, res) => {
  try {
    await Repository.findOneAndUpdate({ _id: req.params.id }, { hookEnabled: true });
    res.status(204).send();
  } catch (e) {
    Raven.captureException(e);
    res.status(400).send(e);
  }
};

module.exports.disable = async (req, res) => {
  try {
    await Repository.findOneAndUpdate({ _id: req.params.id }, { hookEnabled: false });
    res.status(204).send();
  } catch(e) {
    Raven.captureException(e);
    res.status(400).send(e);
  }
};

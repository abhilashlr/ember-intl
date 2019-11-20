/* eslint-env node */

'use strict';

const fs = require('fs');
const path = require('path');
const funnel = require('broccoli-funnel');
const mergeTrees = require('broccoli-merge-trees');
const WatchedDir = require('broccoli-source').WatchedDir;
const isEngine = require('../utils/is-engine');

function isEngineWithIntl(addon) {
  return isEngine(addon) && addon.pkg.dependencies['ember-intl'];
}

function buildTranslationTree(project, inputPath, treeGenerator) {
  const projectTranslations = path.join(project.root, inputPath);
  const trees = [];
  const addonNames = [];
  let maybeProjectTree;

  processAddons(project.addons, addonNames, trees, treeGenerator);

  if (fs.existsSync(projectTranslations)) {
    maybeProjectTree = new WatchedDir(projectTranslations);
  }

  if (project.treeForTranslations) {
    trees.push(project.treeForTranslations(maybeProjectTree));
  } else if (maybeProjectTree) {
    trees.push(maybeProjectTree);
  }

  return [
    funnel(
      mergeTrees(trees, {
        overwrite: true
      }),
      {
        include: ['**/*.yaml', '**/*.yml', '**/*.json']
      }
    ),

    addonNames
  ];
}

function processAddons(addons, addonNames, translationTrees, treeGenerator) {
  addons
    .filter(addon => !isEngineWithIntl(addon))
    .forEach(addon => _processAddon(addon, addonNames, translationTrees, treeGenerator));
}

function _processAddon(addon, addonNames, translationTrees, treeGenerator) {
  const addonTranslationPath = path.join(addon.root, 'translations');
  let addonGeneratedTree;

  if (fs.existsSync(addonTranslationPath)) {
    addonGeneratedTree = treeGenerator.call(addon, addonTranslationPath);
  }

  if (addon.treeForTranslations) {
    let additionalTranslationTree = addon.treeForTranslations(addonGeneratedTree);

    if (additionalTranslationTree) {
      addonNames.push(addon.name);
      translationTrees.push(funnel(additionalTranslationTree, { destDir: addon.name }));
    }
  } else if (addonGeneratedTree !== undefined) {
    addonNames.push(addon.name);
    translationTrees.push(funnel(addonGeneratedTree, { destDir: addon.name }));
  }

  processAddons(addon.addons, addonNames, translationTrees, treeGenerator);
}

module.exports = buildTranslationTree;

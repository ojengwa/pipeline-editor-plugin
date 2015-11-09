//
// See https://github.com/tfennelly/jenkins-js-builder
//
var builder = require('jenkins-js-builder');


builder.src("'src/main/js");

builder.bundle('src/main/js/pipelineeditor.js')
  .inDir('src/main/resources/org/jenkinsci/plugins/pipelineeditor');

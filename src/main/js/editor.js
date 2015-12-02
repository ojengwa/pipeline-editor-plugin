/**
 * Pipeline editor main module. Dreaming of Alaskan pipelines 4 eva. 
 *  Elements that are to be used when actually editing should have a class of 'edit-mode'.
 *  Then we can support read only by simply $('.edit-mode').hide();
 * 
 * I Recommended that you understand the stage/step/parallel/node concepts in workflow well before looking further.
 * "Normal stage" means a normal workflow stage. A "parallel stage" is just a stage that 
 *  has a parallel set of streams (sometimes called branches) under it, as is the workflow convention.
 */

var $ = require('bootstrap-detached').getBootstrap();
var Belay = require('./svg'); 

var stringify = require('./model/stringify');
var wf = require('./model/workflow');



/**
 * Draw the pipeline visualisation based on the pipeline data, including svg.
 * Current pipeline is stored in the "pipeline" variable assumed to be in scope. 
 * Also requires formFields of script and json
 */
exports.drawPipeline = function (pipeline, formFields) {  
  var pRow = $('#pipeline-row');
  pRow.empty();
  
  for (var i=0; i < pipeline.length; i++) {
    var stage = pipeline[i];
    var currentId = "stage-" + i;      
    //append a block if non parallel
    if (!wf.isParallelStage(stage)) {      
      pRow.append(normalStageBlock(currentId, stage));
    } else {      
      var subStages = "";
      for (var j = 0; j < stage.streams.length; j++) {
        var subStage = stage.streams[j];
        var subStageId = currentId + "-" + j;                
        subStages += parStageBlock(stage.name, subStageId, subStage);
      }      
      var stageElement = '<div class="col-md-3"><ul class="list-unstyled">' + subStages + addStreamButton(currentId) + '</ul></div>';
      pRow.append(stageElement);      
    }
  }
  pRow.append(addStageButton());
  
  addNewStageListener(pipeline, formFields);
  addNewStreamListener(pipeline, formFields);
  
  autoJoinDelay(pipeline);  
  addAutoJoinHooks(pipeline);

  addOpenStepListener(pipeline, formFields);
  addNewStepListener(pipeline, formFields);
  
};

/** redraw the pipeline and apply changes to the formFields in the Jenksin config page */
function redrawPipeline(pipeline, formFields) {
  exports.drawPipeline(pipeline, formFields);           
  writeOutChanges(pipeline, formFields);              
}


/** This will add a plain stage to the end of the set of stages */
function addStageButton() {
  return '<div class="col-md-3 edit-mode">' +
          '<button class="list-group-item open-add-stage">' + 
          '<span class="glyphicon glyphicon-plus"></span> Add Stage</button>' + 
          '<div id="add-stage-popover" data-placement="bottom"></div></div>';
}

/** A stream is a named part of a parallel block in workflow */
function addStreamButton(stageId) {
  return '<button class="list-group-item open-add-stream edit-mode" data-stage-id="' + stageId + '">' + 
         '<span class="glyphicon glyphicon-plus"></span></button>' + 
        '<div id="add-stream-popover-' + stageId + '" data-placement="bottom"></div>';
}

/** add a new stream (sometimes called a branch) to the end of the list of streams in a stage */
function addNewStreamListener(pipeline, formFields) {
  $(".open-add-stream").click(function(){
    var stageId = $( this ).attr('data-stage-id');
    var newStreamP = $('#add-stream-popover-' + stageId);
    newStreamP.popover({'content' : newStreamBlock(stageId), 'html' : true});
    newStreamP.popover('show');      
    $('#addStreamBtn-' + stageId).click(function() {
        newStreamP.popover('toggle');
        var newStreamName = $("#newStreamName-" + stageId).val();
        if (newStreamName !== '') {
          var coords = wf.stageIdToCoordinates(stageId);
          pipeline[coords[0]].streams.push({"name" : newStreamName, "steps" : []});
          redrawPipeline(pipeline, formFields);
        }
    });      
  });  


  /** the popover for a new stream */
  function newStreamBlock(stageId) {
    var template = '<div class="input-group">' +                  
                    '<input id="newStreamName-' + stageId + '" type="text" class="form-control" placeholder="New Parallel Branch Name">' +                      
                    '<span class="input-group-btn"><button id="addStreamBtn-' + stageId + '" class="btn btn-default">OK</button></span>' +                  
                  '</div>';   
    return template;
  }
  
}

/** We will want to redraw the joins in some cases */
function addAutoJoinHooks(pipeline) {
  $(".autojoin").click(function() {
    autoJoinDelay(pipeline);
  });
}

/** clicking on a step will open the editor */
function addOpenStepListener(pipeline, formFields) {
  $(".open-editor").click(function(){
    openEditor(pipeline, $( this ).attr('data-action-id'), formFields);
  });
}

/** clicking on add a step should open a popover with a selection of available steps */
function addNewStepListener(pipeline, formFields) { // jshint ignore:line
  $(".open-add-step").click(function(){
    
    var stageId = $( this ).attr('data-stage-id');
    console.log(stageId);
    var newStepP = $('#add-step-popover-' + stageId);
    newStepP.popover({'content' : newStepBlock(stageId, window.pipelineEditors), 'html' : true});
    newStepP.popover('show');      

    $("#addStepBtn-" + stageId).click(function() {        
        var selected = document.querySelector('input[name="newStepType-' + stageId + '"]:checked');
        var name = $('#newStepName-' + stageId).val();
        newStepP.popover('toggle');
        if (selected) {
            console.log(selected.value);  
            console.log(name);
            if (!name) {
              name = "New Step";
            }
            var actionId = wf.insertStep(pipeline, stageId, {"type": selected.value, "name" : name});                      
            redrawPipeline(pipeline, formFields);
            openEditor(pipeline, actionId, formFields);
        }
    });

    /*    wf.insertStep(pipeline, stageId, dummyStep);
     *    //TODO: should refresh only once selected, and select the new step and expand the stage it is in
-    * redrawPipeline(pipeline, formFields); 
     */
     //var selected = document.querySelector('input[name="optionsRadios"]:checked');
     //console.log(selected);
  });
  
  
  
}

/** the popover for a new step */
function newStepBlock(stageId, pipelineEditors) {
  
  var choices = '';   
  for (var key in pipelineEditors) {
    if (pipelineEditors.hasOwnProperty(key)) {
      var ed = pipelineEditors[key];
      choices += '<div class="radio"><label>' +
      '<input type="radio" name="newStepType-' + stageId + '" value="' + key + '">' +
      ed.description + 
      '</label></div>';
    }
  }         
  
  return choices + 
                  '<div class="input-group">' +                                        
                  '<input id="newStepName-' + stageId + '" type="text" class="form-control" placeholder="Step Name">' +                                          
                  '<span class="input-group-btn"><button id="addStepBtn-' + stageId + '" class="btn btn-default">OK</button></span>' +                  
                  '</div>';   
  
}


/** clicking on add a stage will at least ask a user for a name */
function addNewStageListener(pipeline, formFields) { // jshint ignore:line
  $(".open-add-stage").click(function() {
      var newStageP = $('#add-stage-popover');
      newStageP.popover({'content' : newStageBlock(), 'html' : true});
      newStageP.popover('show');      
      $('#addStageBtn').click(function() {
          newStageP.popover('toggle');
          var newStageName = $("#newStageName").val();
          if (newStageName !== '') {
            pipeline.push({"name" : newStageName, "steps" : []});
            redrawPipeline(pipeline, formFields);
          }
      });      
  });
}

/** the popover for a new  stage */
function newStageBlock() {
  var template = '<div class="input-group">' +                  
                  '<input id="newStageName" type="text" class="form-control" placeholder="New Stage Name">' +                      
                  '<span class="input-group-btn"><button id="addStageBtn" class="btn btn-default">OK</button></span>' +                  
                '</div>';   
   return template;
}


/** apply changes to any form-control elements */
function addApplyChangesHooks(pipeline, formFields) {
   $(".form-control").change(function() {
     var actionId = $("#currently-editing").attr('data-action-id');     
     handleEditorSave(pipeline, actionId, formFields);
   });   
}

/**
 * For the given pipeline, put the values in the script and json form fields.
 */ 
function writeOutChanges(pipeline, formFields) {
    formFields.script.val(wf.toWorkflow(pipeline, window.pipelineEditors));
    formFields.json.val(stringify.writeJSON(pipeline));
}

/**
 * parallel stages are an item in an ordered list.
 */
function parStageBlock(stageName, subStageId, subStage) {
  var subStageName = stageName + ": " +  subStage.name;
  return '<li><div id="' + subStageId + '"  class="panel panel-default"><div class="panel-heading">' +
                  '<a role="button" class="autojoin" data-toggle="collapse" href="#' + subStageId + '_collapse">'  + 
                  subStageName + '</a>' + '<div class="collapse" id="' + subStageId + '_collapse">' +
                  stepListing(subStageId, subStage.steps) + '</div>' +
                  '</div></div></li>';
}
exports.parStageBlock = parStageBlock;
 
/**
 * A non parallel stage. Parallel stages are a pipeline editor construct, not an inherent workflow property.
 */
function normalStageBlock(currentId, stage) {
  return '<div class="col-md-3"><div id="' + currentId + '" class="panel panel-default"><div class="panel-heading">' +
                '<a role="button" class="autojoin" data-toggle="collapse" href="#' + currentId + '_collapse">' + 
                stage.name + '</a>' + '<div class="collapse" id="' + currentId + '_collapse">' +
                stepListing(currentId, stage.steps) + '</div>' + '</div></div></div>';
}
exports.normalStageBlock = normalStageBlock;

/**
 * Take a list of steps and return a listing of step buttons
 */
function stepListing(stageId, steps)  {
  if (!steps) {
    return '';
  } else {
    var buttons = '&nbsp;';
    for (var j=0; j < steps.length; ++j) {
        var actionId = stageId + "-" + j;                
        buttons += '<button class="list-group-item open-editor" data-action-id="' + actionId + '">' + steps[j].name +'</button>';      
    }  
      
    var addStepButton = '<button class="list-group-item open-add-step edit-mode" data-stage-id="' + 
                        stageId + '"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span>' +
                        '</button><div id="add-step-popover-' + stageId + '" data-placement="bottom"></div>';
    
    return '<div class="list-group">' + buttons + addStepButton + '</div>';    
  }
}

/**
 * Taking the actionId (co-ordinates), find the step info and load it up.
 */
function openEditor(pipeline, actionId, formFields) {  
  var coordinates = actionIdToStep(actionId);

  var stepInfo = fetchStep(coordinates, pipeline);
  var editorModule = window.pipelineEditors[stepInfo.type];
   
  var editorHtml = editorModule.renderEditor(stepInfo, actionId); 
  var editPanel = $('#editor-panel');
  editPanel.empty();
  editPanel.append("<form id='currently-editing' data-action-id='" + actionId + "'>" + editorHtml + "</form>");    
  
  var stageInfo = pipeline[coordinates[0]];
  $('#editor-heading').text(stageInfo.name + " / " + stepInfo.name);
  
  addApplyChangesHooks(pipeline, formFields);
}

/**
 * When a change is made to a step config, this will be called to apply the changes.
 */
function handleEditorSave(pipeline, actionId, formFields) {
  var currentStep = fetchStep(actionIdToStep(actionId), pipeline);
  var edModule = window.pipelineEditors[currentStep.type];
  if (edModule.readChanges(actionId, currentStep)) {
      console.log("applied changes for " + actionId);
      //exports.drawPipeline(); -- don't want to do this as it collapses the step listing.
      //TODO: make it just update the step name in the view 
      writeOutChanges(pipeline, formFields);
  }
}

/**
 * an actionId is something like stage-1-2 or stage-1-2-3
 * This will return an array of the step co-ordinates.
 * So stage-1-2 = [1,2]
 *    stage-1-2-3 = [1,2,3]
 * the first number is the stage index, second is the step or stream index. 
 * the third number is if it is a parallel stage (so it is [stage, stream, step]) 
 */
function actionIdToStep(actionId) {
    var elements = actionId.split('-');
    switch (elements.length) {
      case 3:
        return [parseInt(elements[1]), parseInt(elements[2])];
      case 4:
        return [parseInt(elements[1]), parseInt(elements[2]), parseInt(elements[3])];  
      default: 
        console.log("ERROR: not a valid actionId");
    }
}
exports.actionIdToStep = actionIdToStep;


/**
 * Take 2 or 3 indexes and find the step out of the pipelineData.
 */
function fetchStep(coordinates, pipelineData) {
   if (coordinates.length === 2) {
     return pipelineData[coordinates[0]].steps[coordinates[1]];
   } else {
     return pipelineData[coordinates[0]].streams[coordinates[1]].steps[coordinates[2]];
   }
}
exports.fetchStep = fetchStep;


/**
  * Join up the pipeline elements visually allowing for parallelism.
  * 
  * from a pipeline that looks logically like: 
  * ["stage-0", ["stage-1-0", "stage-1-1"], "stage-2"]
  * 
  * Becomes: 
  * 
  *      /[]\
  * [] --    --[]
  *      \[]/
  *  
  */
function autoJoin(pipeline) {  
    Belay.off();
    var previousPils = [];    
    for (var i=0; i < pipeline.length; i++) {
      var stage = pipeline[i];
      var currentId = "stage-" + i;      
      if (!wf.isParallelStage(stage)) {      
        joinWith(previousPils, currentId);      
        previousPils = [currentId];      
      } else {      
        var currentPils = [];
        for (j = 0; j < stage.streams.length; j++) {
          currentPils[j] = currentId + "-" + j;                
        }
        for (var j=0; j < stage.streams.length; ++j) {
            joinWith(previousPils, currentPils[j]);
        }
        previousPils = currentPils;              
      }
    }    
}
exports.autoJoin = autoJoin;


/**
 * Draw the connecting lines using SVG and the div ids. 
 */
function joinWith(pilList, currentId) {
  for (var i = 0; i < pilList.length; i++) {
    Belay.on("#" + pilList[i], "#" + currentId);
  }
}


/**
 * Wait until the steps are expanded before joining them together again
 */
function autoJoinDelay(pipeline) {
  Belay.off();
  setTimeout(function() {
    autoJoin(pipeline);
  }, 500);
}

/**
 * Before SVG can be used need to set it up. Only needed once per whole page refresh.
 */
exports.initSVG = function() {
  Belay.init({strokeWidth: 2});
  Belay.set('strokeColor', '#999');
};

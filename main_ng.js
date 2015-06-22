/**
 * Created by michele on 6/22/15.
 */
// check for the various File API support.
if (!window.File || !window.FileReader || !window.FileList) {
  alert('The File APIs are not fully supported in this browser.');
}

var subsliderJS = angular.module('subsliderJS',
  ['angularUtils.directives.dirPagination']);

function FileUploadController($scope, $filter) {

  $scope.fileUpload = { fileUploaded: false };
  $scope.selected = { subtitle: undefined };
  $scope.start = { timestamp: undefined };

  $scope.readFile = function(file) {
    var reader = new FileReader();

    reader.onload = (function() {
      return function(e) {
        $scope.parseSubtitles(e.target.result);
      };
    })(file);

    reader.readAsText(file);
  };

  /**
   * Converts a timestamp in the .srt format to a timestamp in milliseconds.
   *
   * @param captureGroup a regex match containing 4 capture groups, from capture
   * group 1 for hours to capture group 4 for milliseconds
   * @returns {number} the equivalent timestamp in milliseconds
   */
  $scope.convertTimeStamp = function(captureGroups) {
    return parseInt(captureGroups[3]) +
      parseInt(captureGroups[2]) * 1000 +
      parseInt(captureGroups[1]) * 1000 * 60 +
      parseInt(captureGroups[0]) * 1000 * 60 * 60;
  }

  $scope.parseSubtitles = function(fileContent) {
    var subtitleLines = fileContent.split(/\r?\n/),
      subtitles = [],
      index = 0,
      len = subtitleLines.length,
      lenMinusOne = len - 1,
      line,
      currentSubtitle,
      numericCounter,
      timeRe = /(\d{2}):(\d{2})\:(\d{2}),(\d{3}) \-\-> (\d{2}):(\d{2})\:(\d{2}),(\d{3})/,
      timeMatch;

    $scope.fileUpload.fileUploaded = true;

    /*
      The .srt format for a subtitle is:
      (numeric counter)
      (start --> end)
      (any number of dialog lines)
      (empty line)

      e.g.:

      1
      00:00:00,161 --> 00:00:03,413
      I want some sort of document about
      what we've been trying to do here.

      2
      00:00:03,447 --> 00:00:07,654
      I get to pick the writer.
      I'm going with <i>New York Magazine</i> and you.

      etc.
     */

    while (index < len) {
      // find the numeric counter
      line = subtitleLines[index];
      numericCounter = parseInt(line);

      if (numericCounter) {
        currentSubtitle = { id: numericCounter };
        // need to make sure there's one more line, at least
        if (index === lenMinusOne) {
          $scope.subtitleError = true;
          break;
        }
        line = subtitleLines[++index];
        timeMatch = timeRe.exec(line);
        if (!timeMatch) {
          $scope.subtitleError = true;
          break;
        }
        currentSubtitle.from = $scope.convertTimeStamp(timeMatch.slice(1, 5));
        currentSubtitle.to = $scope.convertTimeStamp(timeMatch.slice(5));
        currentSubtitle.dialogLines = [];

        // parse the 1 to many dialog lines
        // need to make sure there's one more line, at least
        if (index === lenMinusOne) {
          $scope.subtitleError = true;
          break;
        }

        // parse the first line
        line = subtitleLines[++index].trim();

        // and all of the following
        while (line && line.length > 0 && index < lenMinusOne) {
          currentSubtitle.dialogLines.push(line);
          line = subtitleLines[++index].trim();
        }

        currentSubtitle.dialogLines = currentSubtitle.dialogLines.join('\n');

        // block's over
        subtitles.push(currentSubtitle);
      }
      index++;
    }

    $scope.subtitles = subtitles;
    $scope.$apply();
  };

  $scope.fileDropped = function() {
    //Get the file
    var file = $scope.uploadedFile;

    if (file.type != 'application/x-subrip') {
      console.log('results may vary')
    }
    $scope.readFile(file);

    //Clear the uploaded file
    $scope.uploadedFile = null;
  };

  $scope.onSubmit = function() {
    var selected = $filter('filter')($scope.subtitles, {id: $scope.selected.subtitle}, true),
      selectedSub = selected[0];

    console.log('yay! starts at ' + $scope.start.timestamp + ', line is: id(' +
      selectedSub.id + '), text(' + selectedSub.dialogLines +
      '), originalStart(' + selectedSub.from + ')');
  }
}

function PaginationController($scope) {

  $scope.currentPage = 1;
  $scope.pageSize = 20;

  $scope.setSelected = function(subtitleId) {
    $scope.selected.subtitle = subtitleId;
  };
}

subsliderJS.controller('FileUploadController', FileUploadController);
subsliderJS.controller('PaginationController', PaginationController);

subsliderJS.directive("dropzone", function($parse, $document) {
  return {
    restrict: "A",
    link: function(scope, element, attrs) {
      var onFileDrop = $parse(attrs.onFileDrop),
        // the native elements
        doc = $document[0],
        el = element[0],
        // used to prevent flickering when dragging
        timeoutId,
        dragging = false;

      // when an item is dragged over the document
      var onDragOver = function(e) {
        clearTimeout(timeoutId);
        e.stopPropagation();
        e.preventDefault();
        if (!dragging) {
          dragging = true;
          doc.body.classList.add('dragOverInactive');
          el.classList.add('dragOverActive');
        }
      };

      // when the user is no longer dragging over the document
      var onDragEnd = function(e) {
        e.stopPropagation();
        e.preventDefault();
        timeoutId = setTimeout(function() {
          dragging = false;
          doc.body.classList.remove('dragOverInactive');
          el.classList.remove('dragOverActive');
        }, 300);
      }

      // when the user drops the item
      var onDragDrop = function(e) {
        onDragEnd(e);
        var file = e.dataTransfer.files[0];
        el.innerHTML = file.name;
        loadFile(file);
      };

      // when a file is dropped
      var loadFile = function(file) {
        scope.uploadedFile = file;
        scope.$apply(onFileDrop(scope));
      };

      // dragging begins on the document
      $document.bind("dragover", onDragOver);
      $document.bind("dragend", onDragEnd);
      $document.bind("dragleave", onDragEnd);

      // dragging ends on the element
      element.bind("drop", function(e) {
        onDragDrop(e);
      });
    }
  }
});

subsliderJS.directive("validateTimeFormat", function() {

  // format is 00:01:23,456
  var regex = /^\s*(\d{1,2}):(\d{2}):(\d{2}),(\d{3})\s*$/;

  return {
    require: 'ngModel',
    link: function(scope, elem, attrs, ctrl) {


      ctrl.$parsers.push(function(value) {
        if (value == '' || value == null || value == undefined) {
          // null means that there is no value which is fine
          return null;
        }

        if (regex.test(value)) {
          return scope.convertTimeStamp(regex.exec(value));
        }

        // undefined means that the date syntax is invalid and
        // this will cause a parse error during validation
        return undefined;
      });

      ctrl.$validators.integer = function (modelValue, viewValue) {

        if (regex.test(viewValue)) {
          return true
        }
        return false;
      };
    }
  }
});

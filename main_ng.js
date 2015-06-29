/*
 subslider.js - a script to fix out-of-sync subtitles.
 Copyright (C) 2015 Michele Bonazza - http://michelebonazza.com

 This program is free software; you can redistribute it and/or
 modify it under the terms of the GNU General Public License
 as published by the Free Software Foundation; either version 2
 of the License, or (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program; if not, write to the Free Software
 Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

// check for the various File API support.
if (!window.File || !window.FileReader || !window.FileList) {
  alert('The File APIs are not fully supported in this browser. ' +
    'Subslider.js may not work!');
}

var subsliderJS = angular.module('subsliderJS',
    ['angularUtils.directives.dirPagination', 'ui.bootstrap']);

function FileUploadController($scope, $filter, $modal) {

  $scope.fileUpload = {fileUploaded: false};
  $scope.selectedSub = {id: undefined, from: undefined};
  $scope.start = {timestamp: undefined};
  $scope.uploadedFile = {name: 'Drop your .srt file here'};
  $scope.editedSubs = {rawText: undefined};
  $scope.processing = {subtitles: false};

  $scope.readFile = function (file) {
    var reader = new FileReader();

    reader.onload = (function () {
      return function (e) {
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
  $scope.convertTimeStamp = function (captureGroups) {
    return parseInt(captureGroups[3]) +
        parseInt(captureGroups[2]) * 1000 +
        parseInt(captureGroups[1]) * 1000 * 60 +
        parseInt(captureGroups[0]) * 1000 * 60 * 60;
  }

  $scope.parseSubtitles = function (fileContent) {
    var subtitleLines = fileContent.split(/\r?\n/),
        subtitles = [],
        index = 0,
        len = subtitleLines.length,
        lenMinusOne = len - 1,
        line,
        currentSubtitle,
        numericCounter,
        timeRe = /(\d{2}):(\d{2}):(\d{2}),(\d{3}) \-\-> (\d{2}):(\d{2}):(\d{2}),(\d{3})/,
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
        currentSubtitle = {id: numericCounter};
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

  $scope.fileDropped = function () {
    // get the file
    var file = $scope.uploadedFile;

    $scope.readFile(file);
  };

  /**
   * Taken from http://stackoverflow.com/a/10073788/1159164.
   * @param n the number to be left-padded
   * @param width the number of positions
   * @param [z] the character to pad the number with (default is '0')
   * @returns {string} a string generated by padding n using character z so that
   *  its length is 'width'
   */
  function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  }

  $scope.msToTimeFormat = function(ts) {
      var millis = ts % 1000,
          secs = Math.floor((ts / 1000) % 60),
          mins = Math.floor((ts / (60000)) % 60),
          hours = Math.floor((ts / (3600000)) % 24);

      return pad(hours, 2) + ":" + pad(mins, 2) + ":" + pad(secs, 2) + "," +
          pad(millis, 3);
  };

  $scope.onSubmit = function () {
    var selected = $filter('filter')($scope.subtitles, {
          id: $scope.selectedSub.id
        }, true),
        selectedSub = selected[0],
        delta = $scope.start.timestamp - selectedSub.from,
        i,
        len,
        currentSub,
        firstShownIndex = 0,
        convertTs = $scope.msToTimeFormat;

    // apply the delta
    $scope.subtitles.forEach(function(element) {
      element.from += delta;
      element.to += delta;
    });

    // if some subtitles have negative "from" or "to" values, remove them
    if ($scope.subtitles[0].from < 0) {
      // find the first subtitle to be displayed
      firstShownIndex = $scope.subtitles.length - 1;

      for (i = 0, len = $scope.subtitles.length; i < len; i++) {
        currentSub = $scope.subtitles[i];

        if (currentSub.to > 0) {
          if (currentSub.from < 0) {
            // subs can't start in the past!
            currentSub.from = 0;
          }
          firstShownIndex = i;
          // since subs are sorted by display time, we're done
          break;
        } // else this subtitle won't be displayed
      }

      if (firstShownIndex > 0) {
        // drop subtitles that won't be displayed
        $scope.subtitles.splice(0, firstShownIndex);

        // renumber subtitles so that they start at 1
        $scope.subtitles.forEach(function (element, index) {
          element.id = index + 1;
        });
      }

    } // else there's no reason to process subs any further

    // create the file content
    $scope.editedSubs.rawText = $scope.subtitles.reduce(function(prev, curr) {
      return prev + curr.id + "\n" +
          convertTs(curr.from) + " --> " + convertTs(curr.to) + "\n" +
          curr.dialogLines + "\n\n";
    }, "");

    // show the modal dialog
    $scope.open();

  };

  $scope.animationsEnabled = true;

  $scope.open = function (size) {

    $modal.open({
      animation: $scope.animationsEnabled,
      templateUrl: 'myModalContent.html',
      controller: 'ModalInstanceCtrl',
      size: size,
      resolve: {
        editedSubs: function () {
          return $scope.editedSubs;
        },
        uploadedFile: function() {
          return $scope.uploadedFile;
        }
      }
    });
  };

  $scope.toggleAnimation = function () {
    $scope.animationsEnabled = !$scope.animationsEnabled;
  };
}

function PaginationController($scope) {

  $scope.currentPage = 1;
  $scope.pageSize = 20;

  $scope.setSelected = function(subtitle) {
    $scope.selectedSub.id = subtitle.id;
    $scope.selectedSub.from = subtitle.from;
    $scope.start.timestamp = subtitle.from;
  };
}

subsliderJS.controller('FileUploadController', FileUploadController);
subsliderJS.controller('PaginationController', PaginationController);

subsliderJS.directive("fileUploader", function ($parse) {
  return {
    restrict: "A",
    link: function (scope, elem, attrs) {
      var onFileChosen = $parse(attrs.onFileChosen);

      elem.bind('change', function (evt) {
        scope.uploadedFile = evt.target.files[0];
        scope.$apply(onFileChosen(scope));
      });
    }
  };
});

subsliderJS.controller('ModalInstanceCtrl',
    function ($scope, $modalInstance, editedSubs, uploadedFile) {
      $scope.editedSubs = editedSubs;
      $scope.uploadedFile = uploadedFile;

      $scope.cancel = function () {
        $modalInstance.dismiss('hey, edited subs were ' +
          $scope.editedSubs.rawText);
      };

      $scope.saveSrtFile = function() {
        console.log("saveSrt " + $scope.uploadedFile.name);

        var blob = new Blob([$scope.editedSubs.rawText],
          {type: "application/x-subrip;charset=utf-8"});

        saveAs(blob, $scope.uploadedFile.name);
      };
});

subsliderJS.directive("dropzone", function ($parse, $document) {
  return {
    restrict: "A",
    link: function (scope, elem, attrs) {
      var onFileDrop = $parse(attrs.onFileDrop),
        doc = $document[0], // the native document DOM element
        el = elem[0], // the native element
        timeoutId, // used to prevent flickering when dragging
        dragging = false;

      // when an item is dragged over the document
      var onDragOver = function (e) {
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
      var onDragEnd = function (e) {
        e.stopPropagation();
        e.preventDefault();
        timeoutId = setTimeout(function () {
          dragging = false;
          doc.body.classList.remove('dragOverInactive');
          el.classList.remove('dragOverActive');
        }, 300);
      }

      // when the user drops the item
      var onDragDrop = function (e) {
        onDragEnd(e);
        var file = e.dataTransfer.files[0];
        el.innerHTML = file.name;
        loadFile(file);
      };

      // when a file is dropped
      var loadFile = function (file) {
        scope.uploadedFile = file;
        scope.$apply(onFileDrop(scope));
      };

      // dragging begins on the document
      $document.bind("dragover", onDragOver);
      $document.bind("dragend", onDragEnd);
      $document.bind("dragleave", onDragEnd);

      // dragging ends on the element
      elem.bind("drop", function (e) {
        onDragDrop(e);
      });
    }
  }
});

subsliderJS.directive("validateTimeFormat", function () {

  // format is 00:01:23,456
  var regex = /^\s*(\d{1,2}):(\d{2}):(\d{2}),(\d{3})\s*$/;

  return {
    require: 'ngModel',
    link: function (scope, elem, attrs, ctrl) {


      ctrl.$parsers.push(function(value) {
        if (value == '' || value == null || value == undefined) {
          // null means that there is no value which is fine
          return null;
        }

        if (regex.test(value)) {
          // shift capturing groups by 1 position to the left
          var captured = regex.exec(value);
          captured.splice(0, 1)
          return scope.convertTimeStamp(captured);
        }

        // undefined means that the date syntax is invalid and
        // this will cause a parse error during validation
        return undefined;
      });

      ctrl.$formatters.push(function(value) {
        if (value == '' || value == null || value == undefined) {
          return null;
        }
        return scope.msToTimeFormat(value);
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

subsliderJS.directive('selectOnClick', ['$window', function($window) {
  return {
    restrict: 'A',
    link: function (scope, element) {
      element.on('click', function () {
        if (!$window.getSelection().toString()) {
          // Required for mobile Safari
          this.setSelectionRange(0, this.value.length)
        }
      });
    }
  };
}]);

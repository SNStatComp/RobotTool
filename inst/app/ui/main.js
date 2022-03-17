/*jslint browser: true*/
/* global $, require*/
/*
 * Copyright 2013 Statistics Netherlands
 *
 * Licensed under the EUPL, Version 1.1 or – as soon they
 * will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * http://ec.europa.eu/idabc/eupl
 *
 * Unless required by applicable law or agreed to in
 * writing, software distributed under the Licence is
 * distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied.
 * See the Licence for the specific language governing
 * permissions and limitations under the Licence.
 */
"use strict"

var libs = [
  "jquery",
  "socketio/socket.io",
  "i18next",
  'i18nextXHRBackend.min',
  "app/init",
  "app/utils",
  "jquery-ui.min",
  "jquery.jqGrid.min",
  "jsdiff",
  "jquery.multiselect",
  "globalize",
  "globalize.culture",
  "d3.min",
  "locales/currencies"
]

define(libs, function($, io, i18next, XHR, init, utils) {

  var
    infoText = {
      version: 'v4.0.1',
      copyright: 'Copyright \u00A9 2015 - 2022 CBS, Statistics Netherland'
    };

    /**
     * Initializes the application
     * @param  {Object} socket The websocket used to show the progress of the operation to the user
     * @return {void}
     */
  function initApp(socket) {
    i18next.changeLanguage(utils.getConfig().Language,
    function () {
      var files = ["i18n/grid.locale-" + utils.getConfig().Language],
        strProcess = i18next.t("Main.Process"),
        strGet = i18next.t("Main.Get");
      if (utils.getConfig().Locale != "en") {
        files.push("globalize.culture." + utils.getConfig().Language);
      }

      socket.on('source', function(data) {
        if (!utils.dialogProgress.dialog("isOpen")) {
          utils.dialogProgress.dialog("open");
        }
        utils.dialogProgress.children('#processSource').text(strGet + data.source + ' - ' + data.message);
        utils.dialogProgress.children('#processBar').progressbar({value: data.index});
      });

      socket.on('processPG', function(data) {
        utils.dialogProgress.dialog("option","title", strProcess);
        utils.dialogProgress.dialog("open");
        utils.dialogProgress.children('#processBar').progressbar({max: data.totalSources});
      });

      socket.on('processPath', function(data) {
        utils.dialogProgress.children('#stepBar').progressbar({max: data.totalSteps, value: data.index});
      });

      socket.on('step', function(data) {
        utils.dialogProgress.children('#stepBar').progressbar({value: data.index});
      });

      require(files, function() {
        Globalize.culture(utils.getConfig().Locale);
        $.getJSON('/data', {
          action: 'getProductgroup',
          element: "sidebar"
        }, function(data) {
          init.initWindow(data, infoText);
        });
      });
    })
  }

  $(document).ready(function() {
    var socket = io();

    utils.dialogProgress = $('div#dialogProgress')
      .dialog({
        autoOpen: false,
        modal: true,
        dialogClass: 'no-close',
        closeOnEscape: false,
        width: 400
      });

    $(document).ajaxError(function(event, xhr) {
      var data;
      try {
        data = JSON.parse(xhr.responseText);
        if ($.inArray(data.action, ["updateSource", "updateSourcePath", "updateProductgroup"]) == -1) {
          alert(data.message);
        }
      } catch (e) {
      }
      $("#spinner").hide();
    });

    $.get('/data?action=getConfig', function(cfg) {
      utils.setConfig(cfg);
      i18next
        .use(XHR)
        .init({
        lng: cfg.Language,
        fallbackLng: "en",
        backend: {
          loadPath: '/locales/{{ns}}-{{lng}}.json'
        }
      }, function(err, t) {
        initApp(socket);
      });
    });
  });
});

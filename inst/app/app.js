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

requirejs.config({
  "baseUrl": "js",
  paths: {
    "app": "../ui",
    "locales": "../locales",
    "socketio": "../socket.io",
    "i18n": "../js/i18n"
  },
  "shim": {
    "jquery-ui.min": ['jquery'],
    "jquery.multiselect": ['jquery', "jquery-ui.min"],
    "jquery.jqgrid.min": ["ui.multiselect", "jquery", "jquery-ui.min", "i18n/grid.locale-nl"],
    "i18n/grid.locale-nl": ['jquery'],
    "i18next.amd.withJQuery.min": ['jquery'],
    "jsdiff": ["jquery.jqgrid.min"],
    "globalize": ['jquery'],
    "globalize.culture": ["globalize", 'jquery'],
    "locales/currencies": ['jquery'],
    "ui.multiselect": ['jquery', "jquery-ui.min"]
  }
});

requirejs(["app/main"]);

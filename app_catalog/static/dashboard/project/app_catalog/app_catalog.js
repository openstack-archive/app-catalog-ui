/*
 * Copyright 2015 IBM Corp.
 * Copyright 2015 Kevin Fox.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function() {
    'use strict';

    angular
        .module('horizon.dashboard.project.app_catalog', [])
        .filter('encodeURIComponent', function() {
            return window.encodeURIComponent;
        }).directive('appAction', function () {
            return {
                restrict: 'EA',
                templateUrl: STATIC_URL + 'dashboard/project/app_catalog/action.html'
            };
        }).directive('appCatalogMagicSearch', [
            'horizon.framework.widgets.basePath',
             appCatalogMagicSearchBar
        ]).controller('appCatalogTableCtrl', [
            '$scope',
            '$http',
            '$timeout',
            '$modal',
            'horizon.framework.widgets.toast.service',
            'appCatalogModel',
            appCatalogTableCtrl
        ]).controller('appComponentCatalogTableCtrl', [
            '$scope',
            '$http',
            '$timeout',
            '$modal',
            'horizon.framework.widgets.toast.service',
            'appCatalogModel',
            appComponentCatalogTableCtrl
        ]).service('appCatalogModel', [
            '$http',
            '$injector',
            'horizon.app.core.openstack-service-api.heat',
            'horizon.app.core.openstack-service-api.glance',
            'horizon.app.core.openstack-service-api.serviceCatalog',
            appCatalogModel
        ]).directive('stars', stars);

    function appCatalogModel($http, $injector, heatAPI, glanceAPI, serviceCatalog) {
        var $scope = this;
        var callbacks = {
            update: [],
            error: [],
            deprecated: [],
            retired: []
        };
        this.assets = [];
        this.assets_filtered = [];
//FIXME reduce duplication here....
        this.supported_service_type_to_label = {
            heat: 'Orchestration',
            glance: 'Images',
            murano: 'Murano'
        };
        this.service_filters = [
            {id:'heat', name:'Orchestration'},
            {id:'glance', name: 'Images'},
            {id:'murano', name: 'Murano'}
        ];
        this.service_filters_selections = {
            'heat':false,
            'glance':false,
            'murano':false
        };
        var notify_update = function(){
            angular.forEach(callbacks['update'], function(callback){
                callback();
            });
        };
        var notify_error = function(message){
            angular.forEach(callbacks['error'], function(callback){
                callback(message);
            });
        };
        var notify_deprecated = function(message){
            angular.forEach(callbacks['deprecated'], function(callback){
                callback(message);
            });
        };
        var notify_retired = function(){
            angular.forEach(callbacks['retired'], function(callback){
                callback();
            });
        };
        var muranoAPI;
        $scope.has_murano = false;
        $scope.selected_facets = [];
        $scope.selected_text = "";
        if ($injector.has('horizon.app.core.openstack-service-api.murano')) {
            muranoAPI = $injector.get('horizon.app.core.openstack-service-api.murano');
            $scope.has_murano = true;
        }
//FIXME [{'name':'heat', 'type':'orchestration'}, {'name':'glance', 'type':'image'}]
        serviceCatalog.get().then(function(catalog){
            angular.forEach(catalog, function(entry){
                if(entry.name in $scope.supported_service_type_to_label) {
                    $scope.service_filters_selections[entry.name] = true;
                }
            });
            $scope.catalog = catalog;
            $scope.update_assets_filtered();
        });
        this.update_assets_filtered = function(){
//FIXME this is not ideal...
            var text_searchable_fields = [
                ['name'],
                ['provided_by', 'name'],
                ['provided_by', 'company'],
                ['supported_by', 'name'],
                ['description'],
                ['license'],
                ['service', 'type'],
                ['service', 'container_format'],
                ['service', 'disk_format'],
                ['service', 'package_name'],
                ['service', 'murano_package_name'],
            ];
            $scope.assets_filtered.length = 0;
            angular.forEach($scope.assets, function(asset){
                if($scope.service_filters_selections[asset.service.type] == true || asset.service.type == 'bundle'){
                    var filtered_out = false;
                    angular.forEach(asset.depends, function(dep){
                      if($scope.service_filters_selections[dep.asset.service.type] == false){
                          filtered_out = true;
                      }
                    });
                    if($scope.selected_facets.length != 0) {
                        angular.forEach($scope.selected_facets, function(filter){
                            var val = filter[0].split('.').reduce(function(obj,i){return obj[i]}, asset);
                            if(val.toLowerCase().indexOf(filter[1].toLowerCase()) == -1){
                                filtered_out = true;
                            }
                        });
                    }
                    if($scope.selected_text != '') {
                        var found = false;
                        angular.forEach(text_searchable_fields, function(field){
                            try {
                                var val = field.reduce(function(obj,i){return obj[i]}, asset);
                                if(val.toLowerCase().indexOf($scope.selected_text.toLowerCase()) != -1){
                                    found = true;
                                }
                            } catch(e) {}
                        });
                        if(!found) {
                            filtered_out = true;
                        }
                    }
                    if(!filtered_out) {
                        $scope.assets_filtered.push(asset);
                    }
                }
            });
            var types = {};
            angular.forEach($scope.assets_filtered, function(asset){
                types[asset.service.type] = true;
            });
//FIXME dedup some of this later.
            var map = {'heat': 'Orchestration', 'glance': 'Images'};
            var options = [];

            for (var type in types) {
                if(type in map) {
                    options.push({'key':type, 'label':map[type]});
                }
            }
            angular.forEach($scope.asset_filter_facets, function(facet){
                if(facet.name == 'service.type') {
//FIXME Doesn't seem to work currently
//                    facet['options'] = options;
                }
            });
            notify_update();
        };
        this.toggle_service_filter = function(service_name) {
            var value = $scope.service_filters_selections[service_name];
            if(value) {
                value = false;
            } else {
                value = true;
            }
            $scope.service_filters_selections[service_name] = value;
            $scope.update_assets_filtered();
        };
        this.register_callback = function(type, callback) {
            callbacks[type].push(callback);
        };
        this.init = function(app_catalog_settings) {
            var app_catalog_url = app_catalog_settings.APP_CATALOG_URL;
            var req = {
                url: app_catalog_url + '/api/v1/assets',
                headers: {
                    'X-Requested-With': undefined,
                    'X-App-Catalog-Versions': [
                        app_catalog_settings.HORIZON_VERSION.VER,
                        app_catalog_settings.HORIZON_VERSION.REL,
                        app_catalog_settings.APP_CATALOG_VERSION.VER,
                        app_catalog_settings.APP_CATALOG_VERSION.REL
                    ].join(' ')
                }
            };
            $http(req).success(function(data) {
                if('deprecated' in data) {
                    notify_deprecated(data['deprecated']);
                }
                if('retired' in data) {
                    notify_retired();
                }
                for (var i in data.assets){
                    var asset = data.assets[i];
                    $scope.assets.push(asset);
                    var process = function(asset) {
                        var url = asset.attributes.url;
                        heatAPI.validate({'template_url': url}, true).success(function(data){
                            asset.validated = true;
                            notify_update();
                        }).error(function(data, status){
                            var str = 'ERROR: Could not retrieve template:'
                            asset.validated = 'unsupported';
                            if(status == 400 && data.slice(0, str.length) == str) {
                                asset.validated = 'error';
                            }
                            notify_update();
                        });
                    }
                    if (asset.service.type == 'heat') {
                        process(asset);
                    } else if (asset.service.type == 'murano') {
                        asset.validated = true;
                    }
                    asset.has_murano = $scope.has_murano;
                }
                $scope.glance_loaded = true;
                $scope.murano_loaded = true;
                update_found_assets($scope);
            }).error(function() {
                notify_error('There was an error while retrieving entries from the Application Catalog.');
            });
            if($scope.has_murano) {
                muranoAPI.getPackages().success(function(data) {
                    $scope.murano_packages = data;
                    var murano_package_definitions = {};
                    for (var p in data.packages){
                        var definitions = data.packages[p]['class_definitions'];
                        for (var d in definitions) {
                            var definition = definitions[d];
                            murano_package_definitions[definition] = {'id': data.packages[p]['id']};
                        }
                    }
                    $scope.murano_package_definitions = murano_package_definitions;
                    update_found_assets($scope);
                });
            }
            glanceAPI.getImages().success(function(data) {
                $scope.glance_images = data;
                var glance_names = {}
                for (var i in data.items){
                    var name = data.items[i]['name'];
                    glance_names[name] = {'id': data.items[i]['id']};
                }
                $scope.glance_names = glance_names;
                update_found_assets($scope);
            });
        };
        this.update_selected_facets = function(selected_facets) {
          $scope.selected_facets.length = 0;
          if(selected_facets != undefined) {
            for(var i in selected_facets) {
              $scope.selected_facets.push(selected_facets[i]);
            }
          }
          $scope.update_assets_filtered();
        }
        this.update_selected_text = function(selected_text) {
          $scope.selected_text = selected_text;
          $scope.update_assets_filtered();
        }
        this.asset_filter_strings = {
            cancel: gettext('Cancel'),
            prompt: gettext('Search'),
            remove: gettext('Remove'),
            text: gettext('Text')
        };
        this.asset_filter_facets = [
        {
          name: 'name',
          label: gettext('Name'),
          singleton: true
        },
        {
          name: 'license',
          label: gettext('License'),
          singleton: true
        },
        {
          name: 'service.type',
          label: gettext('Service Type'),
//FIXME make dynamic later.
          options: [
            {key: 'heat', label: 'Orchestration'},
            {key: 'glance', label: 'Images'},
            {key: 'murano', label: 'Murano'}
          ],
          singleton: true
        }];
    }
    function common_init($scope, $modal, toast, appCatalogModel) {
        $scope.WEBROOT = WEBROOT;
        $scope.STATIC_URL = STATIC_URL;
        $scope.toggle_service_filter = appCatalogModel.toggle_service_filter;
        $scope.service_filters = appCatalogModel.service_filters;
        $scope.service_filters_selections = appCatalogModel.service_filters_selections;
        $scope.asset_filter_strings = appCatalogModel.asset_filter_strings;
        $scope.asset_filter_facets = appCatalogModel.asset_filter_facets;
        $scope.init = appCatalogModel.init;

        var retired = function(){
            var newscope = $scope.$new();
            var modal = $modal.open({
                templateUrl: STATIC_URL + "dashboard/project/app_catalog/retired_panel.html",
                scope: newscope
            });
            newscope.cancel = function() {
                modal.dismiss('');
            };
        }
        var error = function(message){
          toast.add('error', message);
        }
        var deprecated = function(message){
          toast.add('warning', message);
        }
        appCatalogModel.register_callback('error', error);
        appCatalogModel.register_callback('deprecated', deprecated);
        appCatalogModel.register_callback('retired', retired);
//FIXME probably belongs in its own directive...
        var textSearchWatcher = $scope.$on('textSearch', function(event, text) {
          appCatalogModel.update_selected_text(text);

        });
        var textSearchWatcher2 = $scope.$on('searchUpdated', function(event, query) {
          var selected_facets = undefined;
          if(query != '') {
            selected_facets = query.split('&');
            for(var i = 0; i < selected_facets.length; i++){
             var s = selected_facets[i];
             var idx = s.indexOf('=');
             selected_facets[i] = [s.slice(0, idx), s.slice(idx + 1)];
            }
          }
          appCatalogModel.update_selected_facets(selected_facets);
        });
    }
    function appCatalogMagicSearchBar(basePath) {
      var directive = {
        compile: function (element, attrs) {
          /**
           * Need to set template here since MagicSearch template
           * attribute is not interpolated. Can't hardcode the
           * template location and need to use basePath.
           */
          var templateUrl = basePath + 'magic-search/magic-search.html';
          element.find('magic-search').attr('template', templateUrl);
          element.addClass('hz-magic-search-bar');
        },
        restrict: 'E',
        templateUrl: STATIC_URL + "dashboard/project/app_catalog/magic_search.html",
      };
      return directive;
    }

    function appCatalogTableCtrl($scope, $http, $timeout, $modal, toast, appCatalogModel) {
        $scope.assets = []
        var update = function(){
            $scope.assets = []
            for (var i in appCatalogModel.assets_filtered){
                var asset = appCatalogModel.assets_filtered[i];
                if(typeof asset.tags !== "undefined" && asset.tags.indexOf('app') > -1){
                    $scope.assets.push(asset);
                }
            }
        };
        appCatalogModel.register_callback('update', update);
        common_init($scope, $modal, toast, appCatalogModel);
        $scope.switcher = {pannel: 'app', active: 'grid'};
        $scope.changeActivePanel = function(name) {
            $scope.switcher['active'] = name;
        };
        $scope.details = function(asset) {
            var newscope = $scope.$new();
            newscope.asset = asset;
            var modal = $modal.open({
                templateUrl: STATIC_URL + "dashboard/project/app_catalog/details_panel.html",
                scope: newscope
            });
            newscope.cancel = function() {
                modal.dismiss('');
            };
        };
    }

    function appComponentCatalogTableCtrl($scope, $http, $timeout, $modal, toast, appCatalogModel) {
        $scope.assets = appCatalogModel.assets_filtered
        var update = function(){
            $timeout(function() {
                $scope.assets = appCatalogModel.assets_filtered
            }, 0, false);
        };
        appCatalogModel.register_callback('update', update);
        common_init($scope, $modal, toast, appCatalogModel);
        $scope.switcher = {pannel: 'component', active: 'list'};
    }

    function update_found_assets($scope) {
        if('glance_loaded' in $scope && 'glance_names' in $scope){
            for (var i in $scope.assets){
                if($scope.assets[i].service.type != 'glance'){
                    continue;
                }
                var name = $scope.assets[i].name;
                var is_installed = name in $scope.glance_names;
                $scope.assets[i].installed = is_installed;
                if(is_installed){
                    $scope.assets[i].installed_id = $scope.glance_names[name]['id'];
               }
            }
        }
        if('murano_loaded' in $scope && 'murano_package_definitions' in $scope){
            for (var i in $scope.assets){
                if($scope.assets[i].service.type != 'murano'){
                    continue;
                }
                var definition = $scope.assets[i].service.package_name;
                var is_installed = definition in ($scope.murano_package_definitions);
                $scope.assets[i].installed = is_installed;
                if(is_installed) {
                    $scope.assets[i].service.murano_id = $scope.murano_package_definitions[definition]['id'];
                }
            }
        }
        var asset_name_to_asset = {};
        angular.forEach($scope.assets, function(asset){
            asset_name_to_asset[asset.name] = asset;
        });
        angular.forEach($scope.assets, function(asset){
            if('depends' in asset) {
                angular.forEach(asset.depends, function(dep){
                    dep.asset = asset_name_to_asset[dep.name];
                });
            }
        });
        $scope.update_assets_filtered();
    }

    function stars() {
        var star = angular.element('<i>');
        star.addClass('fa fa-star');
        star.css({ color: 'goldenrod' });
        return {
            restrict: 'E',
            scope: { value: '=' },
            link: function(scope, element){
                for (var i = 0; i < scope.value; i++){
                    element.append(star.clone());
                }
            }
        };
    }

})();

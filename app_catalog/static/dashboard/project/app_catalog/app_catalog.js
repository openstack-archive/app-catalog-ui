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
        .module('hz.dashboard.project.app_catalog', ['hz.dashboard'])
        .filter('encodeURIComponent', function() {
            return window.encodeURIComponent;
        }).controller('appCatalogTableCtrl', [
            '$scope',
            '$http',
            '$timeout',
            'appCatalogModel',
            appCatalogTableCtrl
        ]).controller('appComponentCatalogTableCtrl', [
            '$scope',
            '$http',
            '$timeout',
            'appCatalogModel',
            appComponentCatalogTableCtrl
        ]).service('appCatalogModel', [
            '$http',
            'horizon.app.core.openstack-service-api.heat',
            'horizon.app.core.openstack-service-api.glance',
            'horizon.app.core.openstack-service-api.serviceCatalog',
            appCatalogModel
        ]).directive('stars', stars);

    function appCatalogModel($http, heatAPI, glanceAPI, serviceCatalog) {
        var $scope = this;
        var callbacks = [];
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
        var notify = function(){
            angular.forEach(callbacks, function(callback){
                callback();
            });
        };
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
            $scope.assets_filtered.length = 0;
            angular.forEach($scope.assets, function(asset){
                if($scope.service_filters_selections[asset.service.type] == true || asset.service.type == 'bundle'){
                    var filtered_dep = false;
                    angular.forEach(asset.depends, function(dep){
                      if($scope.service_filters_selections[dep.asset.service.type] == false){
                          filtered_dep = true;
                      }
                    });
                    if(!filtered_dep) {
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
            notify();
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
        this.register_callback = function(callback) {
            callbacks.push(callback);
        };
        this.init = function(app_catalog_url) {
            var heat_req = {
                url: app_catalog_url + '/static/heat_templates.json',
                headers: {'X-Requested-With': undefined}
            }
            $http(heat_req).success(function(data) {
                for (var i in data.assets){
                    var asset = data.assets[i];
                    $scope.assets.push(asset);
                    var process = function(asset) {
                        var url = asset.attributes.url;
                        heatAPI.validate({'template_url': url}, true).success(function(data){
                            asset.validated = true;
                            notify();
                        }).error(function(data, status){
                            var str = 'ERROR: Could not retrieve template:'
                            asset.validated = 'unsupported';
                            if(status == 400 && data.slice(0, str.length) == str) {
                                asset.validated = 'error'
                            }
                            notify();
                        });
                    }
                    process(asset);
                }
                update_found_assets($scope)
            });
            var glance_req = {
                url: app_catalog_url + '/static/glance_images.json',
                headers: {'X-Requested-With': undefined}
            }
            glanceAPI.getImages().success(function(data) {
                $scope.glance_images = data;
                var glance_names = {}
                for (var i in data.items){
                    var name = data.items[i]['name'];
                    glance_names[name] = {'id': data.items[i]['id']};
                }
                $scope.glance_names = glance_names;
                update_found_assets($scope)
            });
            $http(glance_req).success(function(data) {
                for (var i in data.assets){
                    var asset = data.assets[i];
                    $scope.assets.push(asset);
                }
                $scope.glance_loaded = true;
                update_found_assets($scope);
            });
            var murano_req = {
                url: app_catalog_url + '/static/murano_apps.json',
                headers: {'X-Requested-With': undefined}
            }
            $http(murano_req).success(function(data) {
                for (var i in data.assets){
                    var asset = data.assets[i];
                    $scope.assets.push(asset);
                }
                $scope.murano_loaded = true;
                update_found_assets($scope);
            });
        };
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

    function common_init($scope, appCatalogModel) {
        $scope.toggle_service_filter = appCatalogModel.toggle_service_filter;
        $scope.service_filters = appCatalogModel.service_filters;
        $scope.service_filters_selections = appCatalogModel.service_filters_selections;
        $scope.asset_filter_strings = appCatalogModel.asset_filter_strings;
        $scope.asset_filter_facets = appCatalogModel.asset_filter_facets;
        $scope.init = appCatalogModel.init;
    }

    function appCatalogTableCtrl($scope, $http, $timeout, appCatalogModel) {
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
        appCatalogModel.register_callback(update);
        common_init($scope, appCatalogModel);
    }

    function appComponentCatalogTableCtrl($scope, $http, $timeout, appCatalogModel) {
        $scope.assets = appCatalogModel.assets_filtered
        var update = function(){
            $timeout(function() {
                $scope.assets = appCatalogModel.assets_filtered
            }, 0, false);
        };
        appCatalogModel.register_callback(update);
        common_init($scope, appCatalogModel);
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
